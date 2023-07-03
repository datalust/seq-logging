const replace = require('@rollup/plugin-replace')
const multiInput = require('rollup-plugin-multi-input')

module.exports = [{
  input: ['./src/**/*.js'],
  output: {
    dir: 'lib/node',
    format: 'cjs',
  },
  plugins: [
    multiInput.default(),
    replace({
      'IS_BROWSER': false,
      preventAssignment: true,
      __buildDate__: () => JSON.stringify(new Date()),
      __buildVersion: 15
    }),
  ]
}, {
  input: ['./src/**/*.js'],
  output: {
    dir: 'lib/browser',
    format: 'es',
  },
  plugins: [
    multiInput.default(),
    replace({
      'IS_BROWSER': true,
      preventAssignment: true,
      __buildDate__: () => JSON.stringify(new Date()),
      __buildVersion: 15
    }),
  ]
}];