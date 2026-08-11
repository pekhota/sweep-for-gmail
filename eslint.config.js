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

  // The extension itself. Runs in a page's isolated world.
  {
    files: ['content.js'],
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
