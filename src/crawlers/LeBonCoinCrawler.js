'use strict';

var utils = require('../utils/vanilla_utils.js'),
    encode_query_params = utils.encode_query_params,
    format = utils.format,
    date_utils = require('../utils/date_utils.js'),
    ajax_proxied = require('../utils/ajax_utils.js').ajax_proxied,
    base_crawler = require('../base_crawler.js');

exports = module.exports = _.extend({}, base_crawler, {
    DISPLAY_NAME: 'LeBonCoin',
    TAG_NAME: 'leboncoin',
    WEBSITE_URL: 'www.leboncoin.fr',
    QUERY_BASE_URL: 'www.leboncoin.fr/covoiturage',
    BASE_QUERY_PARAMS: {
        f: 'a',
        th: 1,
        q: '',
        location: '',
        o: 1, // page index
    },
    HIDDEN_COLUMNS: ['departure_hour', 'driver', 'places'],
    SORT_NAME: 'date',
    SORT_ORDER: 'desc',
    remote_search_links: function (query_params) {
        return {
            'recherche textuelle':
                format('http://{0}/covoiturage?{1}', exports.WEBSITE_URL, encode_query_params(query_params.searchtext)),
            'recherche par localisation':
                format('http://{0}/covoiturage?{1}', exports.WEBSITE_URL, encode_query_params(query_params.searchlocation)),
        };
    },
    get_query_params: function (user_input) {
        var from_place = user_input.from_place.replace(/, France$/, ''),
            to_place = user_input.to_place.replace(/, France$/, '');
        return {
            searchtext: _.extend({}, exports.BASE_QUERY_PARAMS, {q: from_place + ' ' + to_place}),
            searchlocation: _.extend({}, exports.BASE_QUERY_PARAMS, {location: from_place + ',' + to_place}),
        };
    },
    parse_rides_from_response: function (user_input, query_params, data) {
        var ride_date = user_input.date,
            dom_content = exports.div_from_html_string(data);
        if (dom_content.querySelector('#result_ad_not_found')) {
            var query_string = format(query_params.q ? 'q="{q}"' : 'location="{location}"', query_params);
            console.log(format('{0} - Aucune annonce trouvée avec: {1}', exports.WEBSITE_URL, query_string));
            return [];
        }
        var today_utc_time_in_days = date_utils.date_to_days_count(Date.utc.create(ride_date, 'fr')),
            rides =  _.filter(_.map(dom_content.querySelectorAll('.list-lbc a'), function(a) {
                var placement = a.querySelector('div.detail div.placement').textContent;
                // 'placement' can be: city / department or "Paris 14ème"
                exports.assert(placement, 'No placement found for a LBC entry:', a);
                placement = placement.replace(/[ \t\n]+/g, ' ').trim();
                try {
                    var date_extracted = exports.extract_date(a.title);
                    if (date_extracted && date_utils.date_to_days_count(date_extracted) !== today_utc_time_in_days) {
                        //console.log('Discarding ride based on date: title="' + a.title + '"');
                        return false;
                    }
                    if (!exports.is_ride_pertinent(!!date_extracted, a.title, placement, user_input)) {
                        //console.log('Discarding ride based on city pertinence: title="' + a.title + '" - placement="' + placement + '"');
                        return false;
                    }
                    var price_div = a.querySelector('div.detail div.price');
                    return {
                        href: a.href,
                        price: (price_div ? price_div.textContent.trim() : null),
                        journey: a.title,
                        date: (date_extracted && date_utils.format_date_string(date_extracted, '/')) || '-',
                    };
                } catch (error) {
                    throw exports.make_error(error, a);
                }
            }));
        return rides;
    },
    is_ride_pertinent: function (is_date_extracted, title, placement, user_input) {
        title = title.toLowerCase();
        placement = placement.toLowerCase();
        var from_place = user_input.from_place.replace(/, France$/, '').toLowerCase(),
            to_place = user_input.to_place.replace(/, France$/, '').toLowerCase();
        if (from_place.indexOf(',') !== -1) { from_place = from_place.split(',')[0]; }
        if (to_place.indexOf(',') !== -1) { to_place = to_place.split(',')[0]; }
        if (is_date_extracted) { // requires ONLY the departure OR arrival city to be in the description
            return title.indexOf(from_place) !== -1 || placement.indexOf(from_place) !== -1
                || title.indexOf(to_place) !== -1 || placement.indexOf(to_place) !== -1;
        }
        // Else requires BOTH the departure AND arrival cities to be in the description
        return (title.indexOf(from_place) !== -1 || placement.indexOf(from_place) !== -1)
            && (title.indexOf(to_place) !== -1 || placement.indexOf(to_place) !== -1);
    },
    extract_date: function (string) {
        var date = null;
        string.split(' ').every(function (word, i, title_array) {
            if (!/\d/.test(word)) { // heuristic
                return true; // continue
            }
            // Starting with the longest string possible, to catch '26 Novembre 2014' over '26 Novembre'
            return [3, 2, 1].every(function (range) {
                if (i + range > title_array.length) {
                    return true; // continue
                }
                var string_date = _.values(_.pick(title_array, _.range(i, i + range))).join(' ');
                date = Date.utc.create(string_date, 'fr');
                if (date.isValid()) {
                    return false; // break
                }
                date = null;
                return true; // continue
            });
        });
        return date;
    },
    CALLBACKS_PIPELINE: [
        function query_search_website_by_text (cb_chain, user_input) {
            var query_params = exports.get_query_params(user_input);
            ajax_proxied({
                url: exports.QUERY_BASE_URL,
                data: query_params.searchtext,
                success: _.partial(cb_chain.next, user_input, query_params),
                failure: cb_chain.abort,
            });
        },
        function parse_rides_from_searchtext (cb_chain, user_input, query_params, data) {
            var searchtext_rides = exports.parse_rides_from_response (user_input, query_params.searchtext, data);
            if (exports.is_inspector_mode_on('-searchtext')) {
                console.log(searchtext_rides);
                return cb_chain.abort(data);
            }
            cb_chain.next(user_input, query_params, searchtext_rides);
        },
        function query_search_website_by_location (cb_chain, user_input, query_params, searchtext_rides) {
            ajax_proxied({
                url: exports.QUERY_BASE_URL,
                data: query_params.searchlocation,
                success: _.partial(cb_chain.next, user_input, query_params, searchtext_rides),
                failure: cb_chain.abort,
            });
        },
        // jshint maxparams: 5
        function parse_rides_from_searchlocation (cb_chain, user_input, query_params, searchtext_rides, data) {
            var searchlocation_rides = exports.parse_rides_from_response (user_input, query_params.searchlocation, data),
                rides = _.uniq(searchtext_rides.concat(searchlocation_rides), 'href');
            if (exports.is_inspector_mode_on('-searchlocation')) {
                console.log(searchtext_rides, searchlocation_rides, rides);
                return cb_chain.abort(data);
            }
            cb_chain.next(exports, rides, query_params);
        },
    ],
});
