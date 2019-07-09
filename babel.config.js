module.exports = {
  presets: [
    [
      '@quasar/babel-preset-app',
      {
        'presetEnv': {
          'targets': {
            'chrome': '75',
            'firefox': '67'
          }
        }
      }
    ]
  ]
}
