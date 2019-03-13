/* eslint-env node */
/* eslint no-process-env: 0 */

const ip = require('ip')
const {
  browsers,
  browsersKeys
} = require('./browsers')
const babel = require('rollup-plugin-babel')
const istanbul = require('rollup-plugin-istanbul')

const { env } = process
const browserStack = env.BROWSER === 'true'
const debug = env.DEBUG === 'true'
const frameworks = [
  'jasmine'
]

const plugins = [
  'karma-jasmine',
  'karma-rollup-preprocessor'
]

const reporters = ['dots']

const detectBrowsers = {
  usePhantomJS: false,
  postDetection(availableBrowser) {
    if (typeof env.TRAVIS_JOB_ID !== 'undefined' || availableBrowser.includes('Chrome')) {
      return debug ? ['Chrome'] : ['ChromeHeadless']
    }

    if (availableBrowser.includes('Firefox')) {
      return debug ? ['Firefox'] : ['FirefoxHeadless']
    }

    throw new Error('Please install Firefox or Chrome')
  }
}

const customLaunchers = {
  FirefoxHeadless: {
    base: 'Firefox',
    flags: ['-headless']
  }
}

const rollupPreprocessor = {
  plugins: [
    babel({
      // Only transpile our source code
      exclude: 'node_modules/**',
      // Include only required helpers
      externalHelpersWhitelist: [
        'defineProperties',
        'createClass',
        'inheritsLoose',
        'defineProperty',
        'objectSpread'
      ],
      plugins: [
        '@babel/plugin-proposal-object-rest-spread'
      ]
    }),
    istanbul({
      exclude: ['js/src/**/*.spec.js']
    })
  ],
  output: {
    format: 'iife',
    name: 'bootstrapTest',
    sourcemap: 'inline'
  }
}

let files = []

const conf = {
  basePath: '../..',
  port: 9876,
  colors: true,
  autoWatch: false,
  singleRun: true,
  concurrency: Infinity,
  client: {
    clearContext: false
  }
}

if (browserStack) {
  conf.hostname = ip.address()
  conf.browserStack = {
    username: env.BROWSER_STACK_USERNAME,
    accessKey: env.BROWSER_STACK_ACCESS_KEY,
    build: `bootstrap-${new Date().toISOString()}`,
    project: 'Bootstrap',
    retryLimit: 2
  }
  plugins.push('karma-browserstack-launcher')
  conf.customLaunchers = browsers
  conf.browsers = browsersKeys
  reporters.push('BrowserStack')
  files = files.concat([
    { pattern: 'js/src/**/*.spec.js', watched: false }
  ])
  conf.preprocessors = {
    'js/src/**/*.spec.js': ['rollup']
  }
  conf.rollupPreprocessor = rollupPreprocessor
} else {
  frameworks.push('detectBrowsers')
  plugins.push(
    'karma-chrome-launcher',
    'karma-firefox-launcher',
    'karma-detect-browsers',
    'karma-coverage-istanbul-reporter'
  )
  files = files.concat([
    { pattern: 'js/src/**/*.spec.js', watched: false }
  ])
  reporters.push('coverage-istanbul')
  conf.preprocessors = {
    'js/src/**/*.spec.js': ['rollup']
  }
  conf.rollupPreprocessor = rollupPreprocessor
  conf.customLaunchers = customLaunchers
  conf.detectBrowsers = detectBrowsers
  conf.coverageIstanbulReporter = {
    reports: ['lcov', 'text-summary'],
    thresholds: {
      emitWarning: false,
      global: {
        statements: 90,
        branches: 86,
        functions: 89,
        lines: 90
      },
      each: {
        overrides: {
          'js/src/dom/polyfill.js': {
            statements: 39,
            lines: 37,
            branches: 19,
            functions: 50
          }
        }
      }
    }
  }

  if (debug) {
    plugins.push('karma-jasmine-html-reporter')
    reporters.push('kjhtml')
    conf.singleRun = false
    conf.autoWatch = true
  }
}

conf.frameworks = frameworks
conf.plugins = plugins
conf.reporters = reporters
conf.files = files

module.exports = karmaConfig => {
  // possible values: karmaConfig.LOG_DISABLE || karmaConfig.LOG_ERROR || karmaConfig.LOG_WARN || karmaConfig.LOG_INFO || karmaConfig.LOG_DEBUG
  conf.logLevel = karmaConfig.LOG_ERROR || karmaConfig.LOG_WARN
  karmaConfig.set(conf)
}
