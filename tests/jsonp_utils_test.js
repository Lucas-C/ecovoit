'use strict';

var test = require('./tape-enhanced.js'),
    jsonp = require('../src/utils/jsonp_utils.js').jsonp;

test('jsonp', function (t) {
    t.plan(1);
    jsonp({
        url: 'http://jsfiddle.net/echo/jsonp/',
        data: {question: 42},
        success: function (data) {
            t.deepEqual(data, {question: '42'});
        },
    });
});
