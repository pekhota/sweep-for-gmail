// Flat config. Globals are listed by hand rather than pulling in the `globals` package —
// this project ships zero runtime dependencies and the list is short enough to own.

const browserGlobals = {
  chrome: 'readonly',
  console: 'readonly',
  document: 'readonly',
  window: 'readonly',
  location: 'readonly',
  navigator: 'readonly',
  getComputedStyle: 'readonly',
  MutationObserver: 'readonly',
  MouseEvent: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  matchMedia: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLElement: 'readonly',
  Element: 'readonly',
};

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  URL: 'readonly',
  Buffer: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'assets/store/**', 'docs/**'],
  },

  // The extension itself: the content script in a page's isolated world, and the
  // options page, which runs as a normal extension page.
  {
    files: ['content.js', 'options.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      // Correctness — these are the ones that would actually break the extension.
      'no-undef': 'error',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      'no-implicit-coercion': 'off',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'require-atomic-updates': 'error',

      // Async correctness matters here: nearly every entry point is a promise chain
      // driving someone else's UI.
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'off', // deliberate in the polling helpers
      'no-promise-executor-return': 'error',

      // Complexity budget. Set at conventional limits, not at today's numbers, so the
      // file cannot drift back toward the 20-branch DOM-probing functions it started with.
      // IIFEs are exempt from max-lines-per-function: the module wrapper is not a unit.
      complexity: ['error', 8],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': [
        'error',
        { max: 60, skipBlankLines: true, skipComments: true, IIFEs: false },
      ],

      // Hygiene.
      'no-console': ['error', { allow: ['warn', 'error', 'debug'] }],
      'no-alert': 'error',
      'no-debugger': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Build and validation tooling.
  {
    files: ['tools/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
