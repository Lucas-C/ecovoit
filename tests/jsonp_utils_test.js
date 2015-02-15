'use strict';

var test = require('./tape-enhanced.js'),
    jsonp = require('../src/utils/jsonp_utils.js').jsonp,
    protocol = 'http' + (/^https/.test(location.protocol) ? 's' : '');

test('jsonp', function (t) {
    t.plan(1);
    jsonp({
        url: protocol + '://jsfiddle.net/echo/jsonp/',
        data: {question: 42},
        success: function (data) {
            t.deepEqual(data, {question: '42'});
        },
    });
});
