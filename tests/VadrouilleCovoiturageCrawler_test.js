'use strict';

var test = require('./tape-enhanced.js'),
    utils = require('../src/utils/vanilla_utils.js'),
    VadrouilleCovoiturageCrawler = require('../src/crawlers/VadrouilleCovoiturageCrawler.js');

test('VadrouilleCovoiturageCrawler_get_city_info', function (t) {
    t.plan(1);
    var start = Date.now();
    VadrouilleCovoiturageCrawler.get_city_info('Angers', 'test', function (params) {
        var expected = {test_city_id: '18668', test_city_name: 'Angers'};
        t.deepEqual(params, expected, 'Complete ! Elapsed time: ' + (Date.now() - start) + 'ms');
    });
});

test('VadrouilleCovoiturageCrawler_get_city_info_nomatch', function (t) {
    t.plan(1);
    VadrouilleCovoiturageCrawler.get_city_info('XYZ', 'test', t.fail.bind(t), t.pass.bind(t));
});

test('VadrouilleCovoiturageCrawler_get_city_info_with_diacritic', function (t) {
    t.plan(1);
    var start = Date.now();
    VadrouilleCovoiturageCrawler.get_city_info('Besançon', 'test', function (params) {
        var expected = {test_city_id: '9377', test_city_name: 'Besançon'};
        t.deepEqual(params, expected, 'Complete ! Elapsed time: ' + (Date.now() - start) + 'ms');
    });
});

test('VadrouilleCovoiturageCrawler_city_info_strict-homonyms', function (t) {
    t.plan(2);
    VadrouilleCovoiturageCrawler.get_city_info('Aboncourt', 'departure', function (city_info) {
        t.pass(city_info);
    });
    VadrouilleCovoiturageCrawler.get_city_info('Blandy', 'departure', function (city_info) {
        t.pass(city_info);
    });
});

test('VadrouilleCovoiturageCrawler_get_and_extract_rides_with_diacritic', function (t) {
    t.plan(1);
    var user_input = {
            date: '26/01/2015',
            from_place: 'Paris',
            to_place: 'Besançon',
        },
        start = Date.now(),
        last_callback = function (crawler, rides) {
            t.pass('Complete ! Elapsed time: ' + (Date.now() - start) + 'ms - Rides (' + rides.length + '): ' + JSON.stringify(rides));
        },
        callbacks = _.union(VadrouilleCovoiturageCrawler.CALLBACKS_PIPELINE, [last_callback]);
    utils.execute_callbacks_chain(callbacks, t.fail.bind(t), user_input);
});
