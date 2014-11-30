'use strict';

var test = require('./tape-enhanced.js'),
    cookies_mgr = require('../src/utils/cookies_mgr.js');

test('cookies_mgr-get-set-json-lists', function (t) {
    t.plan(2);

    var invariable_list = ['a', 0, false, null, []];
    cookies_mgr.set_json('test-list', invariable_list);
    t.deepEqual(cookies_mgr.get_json('test-list'), invariable_list);

    var modified_list = [Infinity, NaN, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        expected_list = [null, null, null, null, null, null];
    cookies_mgr.set_json('test-list', modified_list);
    t.deepEqual(cookies_mgr.get_json('test-list'), expected_list);
});

test('cookies_mgr-get-set-json-nested-object', function (t) {
    t.plan(1);
    var invariable_object = {a:'b', c:['d', {e: 'f'}]};
    cookies_mgr.set_json('test-object', invariable_object);
    t.deepEqual(cookies_mgr.get_json('test-object'), invariable_object);
});
