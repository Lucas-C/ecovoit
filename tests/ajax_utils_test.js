'use strict';

var test = require('./tape-enhanced.js'),
    ajax_utils = require('../src/utils/ajax_utils.js');

test('ajax-to-httpbin-by-proxy', function (t) {
    t.plan(1);
    ajax_utils.ajax_proxied({
        url: 'httpbin.org/get',
        data: {answer:42},
        dataType: 'JSON',
        success: function (data) {
            t.equal(data.args.answer, '42');
        },
    });
});
