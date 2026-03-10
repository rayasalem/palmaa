/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2022: true, browser: true },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['unused-imports'],
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  ignorePatterns: [
    'node_modules/',
    'server/node_modules/',
    'dist/',
    'build/',
    '*.config.js',
    '*.config.cjs',
    'cypress/',
  ],
};
