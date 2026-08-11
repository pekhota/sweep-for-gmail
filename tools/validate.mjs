#!/usr/bin/env node
/**
 * Project invariants that a linter can't see.
 *
 * These are the things that either get the extension rejected by the Chrome Web Store or
 * quietly make a published claim untrue. Each one has burned somebody at some point:
 *
 *   - Store limits (name 75, description 132) are enforced at submission, not at build.
 *   - Icons declared in the manifest must exist AND be the pixel size they claim.
 *   - Screenshots must be EXACTLY 1280x800; "close enough" is rejected.
 *   - The listing and privacy policy both promise zero network calls. That promise is
 *     one careless `fetch` away from being a lie, so it is enforced here.
 *   - Permission creep is the single most common rejection reason.
 *
 *   node tools/validate.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `\n          ${detail}` : ''}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Width and height straight out of a PNG's IHDR chunk — no image library needed. */
function pngSize(rel) {
  const buf = readFileSync(join(ROOT, rel));
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isPng) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/* ------------------------------------------------------------------ *
 * Manifest
 * ------------------------------------------------------------------ */

section('manifest');

const manifest = JSON.parse(read('manifest.json'));

check('manifest_version is 3', manifest.manifest_version === 3, `got ${manifest.manifest_version}`);
check(
  `name within the store's 75 characters (${manifest.name.length})`,
  manifest.name.length <= 75,
  manifest.name
);
check(
  `description within the store's 132 characters (${manifest.description.length})`,
  manifest.description.length > 0 && manifest.description.length <= 132
);
check('version is semver', /^\d+\.\d+(\.\d+)?(\.\d+)?$/.test(manifest.version), manifest.version);
check(
  'name does not lead with a trademark',
  !/^(gmail|google)/i.test(manifest.name.trim()),
  'store rejects names starting with a trademark it does not own'
);

// Permission creep is the top rejection reason, so the allowlist is deliberately explicit:
// adding a permission has to be a conscious edit here, alongside its justification.
const ALLOWED_PERMISSIONS = ['storage'];
const permissions = manifest.permissions ?? [];
check(
  `permissions limited to [${ALLOWED_PERMISSIONS.join(', ')}]`,
  permissions.every((p) => ALLOWED_PERMISSIONS.includes(p)),
  `found: ${JSON.stringify(permissions)} — if intentional, update ALLOWED_PERMISSIONS and CHROMEWEBSTORE.md`
);
check('no host_permissions', !manifest.host_permissions, JSON.stringify(manifest.host_permissions));
check('no background service worker', !manifest.background);
check('no optional_permissions', !manifest.optional_permissions);

const matches = manifest.content_scripts?.flatMap((cs) => cs.matches) ?? [];
check(
  'content script scoped to mail.google.com only',
  matches.length > 0 && matches.every((m) => m.startsWith('https://mail.google.com/')),
  JSON.stringify(matches)
);

/* ------------------------------------------------------------------ *
 * Icons
 * ------------------------------------------------------------------ */

section('icons');

for (const [size, path] of Object.entries(manifest.icons ?? {})) {
  const expected = Number(size);
  if (!existsSync(join(ROOT, path))) {
    check(`${path} exists`, false, 'declared in the manifest but missing from disk');
    continue;
  }
  const dims = pngSize(path);
  check(
    `${path} is ${expected}x${expected}`,
    dims && dims.width === expected && dims.height === expected,
    dims ? `got ${dims.width}x${dims.height}` : 'not a valid PNG'
  );
}

const iconPaths = Object.values(manifest.icons ?? {});
check('every declared icon size is a distinct file', new Set(iconPaths).size === iconPaths.length);

/* ------------------------------------------------------------------ *
 * The privacy promise
 * ------------------------------------------------------------------ */

section('privacy invariants');

const source = read('content.js');

const FORBIDDEN = [
  ['fetch(', 'network request'],
  ['XMLHttpRequest', 'network request'],
  ['WebSocket', 'network connection'],
  ['sendBeacon', 'network request'],
  ['EventSource', 'network connection'],
  ['storage.sync', 'transmits to Google servers — the listing says local only'],
  ['importScripts', 'remote code'],
  ['eval(', 'remote/dynamic code — store policy violation'],
  ['new Function', 'dynamic code — store policy violation'],
];

for (const [needle, why] of FORBIDDEN) {
  check(`content.js contains no ${needle}`, !source.includes(needle), why);
}

check(
  'storage use is chrome.storage.local only',
  !source.includes('chrome.storage') || source.includes('chrome.storage.local')
);

// The extension is meant to render nothing that talks to the outside world.
check('no remote asset URLs in source', !/https?:\/\/(?!mail\.google\.com)[\w.-]+\//.test(source));

/* ------------------------------------------------------------------ *
 * Store artwork
 * ------------------------------------------------------------------ */

section('store artwork');

const ARTWORK = {
  'shot-1.png': [1280, 800],
  'shot-2.png': [1280, 800],
  'shot-3.png': [1280, 800],
  'shot-4.png': [1280, 800],
  'shot-5.png': [1280, 800],
  'promo-small.png': [440, 280],
  'promo-marquee.png': [1400, 560],
};

const storeDir = 'assets/store';
if (!existsSync(join(ROOT, storeDir))) {
  check('assets/store exists', false, 'run ./tools/make_assets.sh');
} else {
  for (const [file, [w, h]] of Object.entries(ARTWORK)) {
    const rel = `${storeDir}/${file}`;
    if (!existsSync(join(ROOT, rel))) {
      check(`${file} exists`, false, 'run ./tools/make_assets.sh');
      continue;
    }
    const dims = pngSize(rel);
    check(
      `${file} is exactly ${w}x${h}`,
      dims && dims.width === w && dims.height === h,
      dims ? `got ${dims.width}x${dims.height} — the store rejects anything else` : 'not a valid PNG'
    );
  }

  const stray = readdirSync(join(ROOT, storeDir)).filter((f) => f.endsWith('.png') && !ARTWORK[f]);
  check('no unexpected files in assets/store', stray.length === 0, stray.join(', '));
}

/* ------------------------------------------------------------------ *
 * Listing and docs consistency
 * ------------------------------------------------------------------ */

section('listing consistency');

const listing = read('CHROMEWEBSTORE.md');

check('CHROMEWEBSTORE.md quotes the manifest name', listing.includes(manifest.name));
check('CHROMEWEBSTORE.md quotes the manifest description', listing.includes(manifest.description));
check(
  `CHROMEWEBSTORE.md version history mentions ${manifest.version}`,
  listing.includes(manifest.version),
  'bump the version history when bumping the manifest'
);

for (const page of ['docs/index.html', 'docs/privacy.html']) {
  check(`${page} exists`, existsSync(join(ROOT, page)));
}

const privacyPage = read('docs/privacy.html');
check('privacy policy states no data collection', /does not collect/i.test(privacyPage));
check(
  'privacy policy lists every manifest permission',
  permissions.every((p) => privacyPage.includes(p)),
  `missing from docs/privacy.html: ${permissions.filter((p) => !privacyPage.includes(p)).join(', ')}`
);

for (const doc of ['CLAUDE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'LICENSE']) {
  check(`${doc} exists`, existsSync(join(ROOT, doc)));
}

check(
  `CHANGELOG.md documents ${manifest.version}`,
  read('CHANGELOG.md').includes(manifest.version),
  'add a changelog entry when bumping the manifest version'
);

const landing = read('docs/index.html');
check('landing page has no dead-end CTA', !/href="#"/.test(landing), 'a button links to "#"');

/* ------------------------------------------------------------------ *
 * Package contents
 * ------------------------------------------------------------------ */

section('package');

const SHIPPED = ['manifest.json', 'content.js', 'content.css', ...iconPaths];
for (const file of SHIPPED) {
  check(`${file} present`, existsSync(join(ROOT, file)));
}

const packageScript = read('tools/package.sh');
check(
  'package.sh ships no development files',
  !['docs', 'assets', 'tools', 'CHROMEWEBSTORE', 'LAUNCH', 'node_modules'].some((d) =>
    new RegExp(`^\\s+${d}`, 'm').test(packageScript)
  )
);

/* ------------------------------------------------------------------ */

console.log(`\n${failures ? 'FAILED' : 'PASSED'} — ${checks - failures}/${checks} checks passed\n`);
process.exit(failures ? 1 : 0);
