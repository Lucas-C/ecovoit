'use strict';

var test = require('./tape-enhanced.js'),
    LeBonCoinCrawler = require('../src/crawlers/LeBonCoinCrawler.js'),
    current_year = Date.utc.create().format('{yyyy}');

_.forOwn({
    'Nantes/Le mans le 26 Novembre 2014': Date.utc.create('2014/11/26', 'fr'),
    'NANTES/QUEMPER le samedi 20 decembre a 14h30': Date.utc.create(current_year + '/12/20', 'fr'),
    'Nantes / paris le 25/12/2014': Date.utc.create('2014/12/25', 'fr'),
}, function(expected_date, title) {
    test('LeBonCoinCrawler.extract_date : ' + title, function (t) {
        t.plan(1);
        var extracted_date = LeBonCoinCrawler.extract_date(title);
        t.equal(extracted_date && extracted_date.getTime(), expected_date && expected_date.getTime(), extracted_date);
    });
});

_.forOwn([
    {title: 'Co Voiturage Pornic - PAris + Etapes',
     placement: 'Pornic / Loire-Atlantique',
     from_place: 'Angers', to_place: 'Nantes',
     expected: false},
], function(ride, index) {
    test('LeBonCoinCrawler.is_ride_pertinent : ' + index, function (t) {
        t.plan(1);
        t.equal(LeBonCoinCrawler.is_ride_pertinent('one_city', ride.title, ride.placement, ride),
                ride.expected);
    });
});
