'use strict';

var test = require('./tape-enhanced.js'),
    date_utils = require('../src/utils/date_utils.js');

test('date_utils-date_to_days_count', function (t) {
    t.plan(4);
    t.ok(date_utils.date_to_days_count(Date.utc.create()) % 1 === 0, 'Is integer');
    t.ok(date_utils.date_to_days_count(Date.create()) % 1 === 0, 'Is integer');
    t.equal(date_utils.date_to_days_count(Date.utc.create('1/01/1970')), 0, 'Epoch');
    t.equal(date_utils.date_to_days_count(Date.create(0).addDays(1)), 1, 'The day after EPOCH');
});

test('date_utils-date_to_days_count', function (t) {
    t.plan(2);
    var epoch = Date.utc.create('January 1, 1970'),
        the_day_after_epoch = epoch.clone().addDays(1),
        today = Date.create().beginningOfDay(),
        the_day_after_tomorrow = today.clone().addDays(2);
    t.equal(date_utils.date_difference_in_days(the_day_after_epoch, epoch), 1);
    t.equal(date_utils.date_difference_in_days(today, the_day_after_tomorrow), -2);
});

test('date_utils-is_today-true', function (t) {
    t.plan(1);
    var query_date = date_utils.format_date_string(Date.create().beginningOfDay(), '/');
    t.true(date_utils.is_today(query_date));
});

test('date_utils-is_today-false', function (t) {
    t.plan(1);
    var query_date = date_utils.format_date_string(Date.create().addDays(1).beginningOfDay(), '/');
    t.false(date_utils.is_today(query_date));
});

test('date_utils-is_tomorrow-true', function (t) {
    t.plan(1);
    var query_date = date_utils.format_date_string(Date.create().addDays(1).beginningOfDay(), '/');
    t.true(date_utils.is_tomorrow(query_date));
});

test('date_utils-is_tomorrow-false', function (t) {
    t.plan(1);
    var query_date = date_utils.format_date_string(Date.create().beginningOfDay(), '/');
    t.false(date_utils.is_tomorrow(query_date));
});
