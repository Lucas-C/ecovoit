'use strict';

var test = require('./tape-enhanced.js'),
    utils = require('../src/utils/vanilla_utils.js'),
    IdVroomCrawler = require('../src/crawlers/IdVroomCrawler.js');

test('IdVroom_get_city_info', function (t) {
    t.plan(1);
// jscs: disable validateQuoteMarks
    IdVroomCrawler.get_city_info("Saint-Barthélémy d'Anjou", 'departure', function (city_info) {
        t.deepEqual(city_info, {
            'departure[cityJsAutoComp]': "Saint-Barthélemy-d'Anjou - 49124",
// jscs: enable validateQuoteMarks
            'departure[cityJsId]': '26898',
            'departure[cityGeocode]': 'FR 49124',
            'departure[placeJsId]': '',
        });
    });
});

test('IdVroom_get_city_info_same_prefix', function (t) {
    t.plan(1);
    IdVroomCrawler.get_city_info('Saint-Valéry', 'departure', function (city_info) {
        t.pass(city_info); // 'Saint-Valéry-en-Caux' & 'Saint-Valery-sur-Somme' should be discarded
    });
});

test('IdVroom_get_city_info_2_postal_codes', function (t) {
    t.plan(1);
    IdVroomCrawler.get_city_info('Angers', 'departure', function (city_info) {
        t.pass(city_info);
    });
});

test('IdVroom_get_city_info_nomatch', function (t) {
    t.plan(1);
    IdVroomCrawler.get_city_info('Aéroport Lyon Saint Exupéry', 'departure', t.fail.bind(t), t.pass.bind(t));
});

// Cf. http://fr.wikipedia.org/wiki/Cat%C3%A9gorie:Homonymie_de_communes_et_d%27anciennes_communes_fran%C3%A7aises
test('IdVroom_get_city_info_homonyms-with-different-accents', function (t) {
    t.plan(1);
    IdVroomCrawler.get_city_info('Abbécourt', 'departure', function (city_info) {
        t.pass(city_info);
    });
});

test('IdVroom_get_city_info_strict-homonyms', function (t) {
    t.plan(2);
    IdVroomCrawler.get_city_info('Aboncourt', 'departure', function (city_info) {
        t.pass(city_info);
    });
    IdVroomCrawler.get_city_info('Blandy', 'departure', function (city_info) {
        t.pass(city_info);
    });
});
