'use strict';

var test = require('./tape-enhanced.js'),
    utils = require('../src/utils/vanilla_utils.js'),
    atlas = require('../src/utils/google_places_atlas.js');

test('google_places_atlas_get_city_info', function (t) {
    t.plan(1);
    var start = Date.now();
    atlas.city_lookup('Angers', function (city_info) {
        var expected = {name: 'Angers', lat: 47.478419, lon: -0.5631660000000238};
        t.deepEqual(city_info, expected, 'Complete ! Elapsed time: ' + (Date.now() - start) + 'ms');
    });
});

test('google_places_atlas_get_city_info_nomatch', function (t) {
    t.plan(1);
    atlas.city_lookup('XYZ', function (city_info) {
        t.ok(city_info instanceof Error, 'Error raised for unknown place: ' + utils.pretty_string(city_info));
    });
});

test('google_places_atlas_get_city_info_with_diacritic', function (t) {
    t.plan(1);
    var start = Date.now();
    atlas.city_lookup('Besançon', function (city_info) {
        t.pass(utils.pretty_string(city_info) + ' Elapsed time: ' + (Date.now() - start) + 'ms');
    });
});
