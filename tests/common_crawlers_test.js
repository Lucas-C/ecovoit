'use strict';

var test = require('./tape-enhanced.js'),
    dom = require('../src/utils/dom_shorthands.js'),
    utils = require('../src/utils/vanilla_utils.js'),
    date_utils = require('../src/utils/date_utils.js'),
    autocomplete_geocoder = require('../src/utils/google_autocomplete_geocoder.js'),
    crawlers_list = require('../src/crawlers_list.js');

crawlers_list.AVAILABLE_CRAWLERS.forEach(function(crawler) {
    test(crawler.DISPLAY_NAME + 'Crawler_full-blackbox-test', function (t) {
        t.plan(1);
        var user_input = {
                date: date_utils.format_date_string(Date.create().beginningOfDay(), '/'),
                from_place: 'Angers',
                to_place: 'Nantes',
                departure_hour_min: '6',
            },
            start = Date.now(),
            last_callback = function (callback, crawler, rides) {
                t.pass('Complete ! Elapsed time: ' + (Date.now() - start) + 'ms - Rides (' + rides.length + '): ' + JSON.stringify(rides));
            },
            callbacks = _.union(crawler.CALLBACKS_PIPELINE, [last_callback]);
        autocomplete_geocoder.init(dom.byId('from-place'), dom.byId('to-place'));
        autocomplete_geocoder.get_from_to_lat_lng(user_input, function (lat_lng) {
            utils.execute_callbacks_chain(callbacks, t.fail.bind(t), user_input, lat_lng);
        });
    });
});
