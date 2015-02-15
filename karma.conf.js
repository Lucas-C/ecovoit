module.exports = function(config) {
  'use strict';
  config.set({
    frameworks: ['browserify', 'tap'],
    files: [
      'tests/jsonp_utils_test.js',
      //'tests/**/*.js',
    ],
    exclude: [
      '**/*.py',
      '**/*.html',
    ],
    preprocessors: {
        'test/**/*.js': ['browserify']
    },
    browsers: ['PhantomJS'],
    logLevel: 'LOG_DEBUG',
  });
};
