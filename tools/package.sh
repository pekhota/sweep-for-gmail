#!/usr/bin/env bash
# Build the Chrome Web Store upload ZIP.
#
# Ships only what the extension needs at runtime. Everything else — sources for the
# artwork, the store listing notes, the landing page, git history — is excluded, both to
# keep the package small and because reviewers flag unexplained extra files.
#
#   ./tools/package.sh   ->  dist/sweep-1.0.0.zip

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')"
OUT="dist/sweep-$VERSION.zip"

mkdir -p dist
rm -f "$OUT"

zip -rq "$OUT" \
  manifest.json \
  content.js \
  content.css \
  icons \
  -x '*.DS_Store'

echo "$OUT"
unzip -l "$OUT" | awk 'NR>3 && $4 != "" && $1 ~ /^[0-9]+$/ {printf "  %8s  %s\n", $1, $4}'

echo
echo "Package contents must be exactly: manifest.json, content.js, content.css, icons/*.png"
