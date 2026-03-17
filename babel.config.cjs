/** Babel config for Jest: transform ESM to CJS so Jest can run tests. */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]],
  plugins: ['babel-plugin-transform-import-meta'],
};
