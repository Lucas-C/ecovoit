'use strict';

var date_utils = require('../utils/date_utils.js'),
    ajax_proxied = require('../utils/ajax_utils.js').ajax_proxied,
    city_homonyms = require('../utils/homonymous_city_names.js'),
    base_crawler = require('../base_crawler.js'),
    city_info_from_city_result = function (prefix, city_result) {
        var city_info = {};
        city_info[prefix + '[placeJsId]'] = '';
        ['cityJsAutoComp', 'cityJsId', 'cityGeocode'].forEach(function(key) {
            city_info[prefix + '[' + key + ']'] = city_result[key];
        });
        return city_info;
    };

exports = module.exports = _.extend({}, base_crawler, {
    DISPLAY_NAME: 'IdVroom',
    TAG_NAME: 'idvroom',
    WEBSITE_URL: 'www.idvroom.com',
    AUTOCOMPLETE_URL: 'www.idvroom.com/autocomplete/city/',
    QUERY_BASE_URL: 'www.idvroom.com/recherche-trajet',
    HIDDEN_COLUMNS: ['date'],
    remote_search_links: function () {
        // 'POST' request mandatory => 'remote_search_links' not usable from the browser of the user
        return null;
    },
    get_base_query_params: function (user_input) {
        var hour_picked = user_input.departure_hour_min,
            now_hour = Date.create().format('{HH}');
        if (date_utils.is_today(user_input.date) && +hour_picked <= +now_hour) {
            hour_picked = Date.create().addMinutes(5).format('{HH}:{mm}');
        } else {
            if ('' + hour_picked === '24') {
                hour_picked = '00';
            }
            hour_picked = ('0' + hour_picked).slice(-2) + ':00';
        }
        return {
            'punctualDeparture[date]': user_input.date,
            'punctualDeparture[hour]': hour_picked,
            'frequencies[1]': 1,
            'frequencies[0]': 0, // or 1 ?
            'roles[1]': 1,
            'roles[0]': 1,
            'roles[2]': 1,
            availableSeats: 1,
            order: 'hour', // Or: price / places
            direction: 'ASC',
            searchType: 'SEARCH_QUICK',
            submit: '',
            //currentPage: 1, // do not seem to work
            //perPage: 40, // do not seem to work
            // SEARCH_ADVANCED =>
            //  frequency=1/0
            //  preferences[luggages-s/luggages-l/luggages-xl/no-smoke/animals/detours]
            //  arrival/departure[range] 1-10km
        };
    },
    CITY_RESULT_CACHE: {}, // DOES NOT CACHE ERRORS
    get_city_info: function (query_city_name, prefix, success_callback, failure_callback) {
        var city_result_from_cache = exports.CITY_RESULT_CACHE[query_city_name];
        if (city_result_from_cache) {
            success_callback(city_info_from_city_result(prefix, city_result_from_cache));
            return;
        }
        ajax_proxied({
            url: exports.AUTOCOMPLETE_URL + query_city_name,
            data_type: 'JSON',
            success: function (data) {
                try {
                    var city_result = exports.parse_city_info(query_city_name, data);
                    exports.CITY_RESULT_CACHE[query_city_name] = city_result;
                    success_callback(city_info_from_city_result(prefix, city_result));
                } catch (error) {
                    error.city_name = query_city_name;
                    failure_callback(error);
                }
            },
            failure: failure_callback,
        });
    },
    parse_city_info: function (query_city_name, data) {
        exports.assert(data && data.length > 0, 'City name lookup failed');
        var department_codes = _.map(data, function (city_info) {
                return city_info.name.slice(-5, -3);
            }),
            city_info_candidates = city_homonyms.get_best_city_info_candidates(
                    query_city_name, data, _.pluck(data, 'shortname'), department_codes),
            city_result = city_info_candidates[0];
        if (city_info_candidates.length > 1) {
            city_homonyms.display_homonyms_warning(exports.WEBSITE_URL, query_city_name, _.pluck(city_info_candidates, 'name'));
        }
        return city_result;
    },
    CALLBACKS_PIPELINE: [
        function get_departure_city_info (cb_chain, user_input) {
            var departure_city_name = user_input.from_place.replace(/, France$/, '');
            exports.get_city_info(departure_city_name, 'departure', _.partial(cb_chain.next, user_input), cb_chain.abort);
        },
        function get_arrival_city_info (cb_chain, user_input, departure_city_params) {
            var arrival_city_name = user_input.to_place.replace(/, France$/, ''),
                base_query_params = exports.get_base_query_params(user_input);
            exports.get_city_info(arrival_city_name, 'arrival', function (arrival_city_params) {
                cb_chain.next(_.extend(base_query_params,
                                       departure_city_params,
                                       arrival_city_params));
            }, cb_chain.abort);
        },
        function query_search_website (cb_chain, query_params) {
            ajax_proxied({
                method: 'POST',
                url: exports.QUERY_BASE_URL,
                data: query_params,
                success: _.partial(cb_chain.next, query_params),
                failure: cb_chain.abort,
            });
        },
        function parse_rides_from_response (cb_chain, query_params, data) {
            if (exports.is_inspector_mode_on()) {
                return cb_chain.abort(data);
            }
            exports.assert(!/Le formulaire n'est pas valide/.test(data), 'Formulaire invalide: '
                    + 'peut-etre avez-vous selectionné une date / heure dans le passé ?');
            var dom_content = exports.div_from_html_string(data),
            tripviews_list = dom_content.querySelector('#results-list > ul.trip-result-list'),
                rides = _.filter(_.map(dom_content.querySelectorAll('#nb-results-slider > li.span1'), function(li, i) {
                var tripview = tripviews_list.children[i];
                try {
                    if (!li.attributes.name.value) {
                        return; // last empty 'li'
                    }
                    var tripview_id = li.attributes.name.value.match(/to-(.*)/)[1],
                        places_span = tripview.querySelector('span.total-places');
                    exports.assert(tripview.attributes.name.value === 'tripview-' + tripview_id, 'tripview_id mismatch: the results ordering is skewed');
                    return {
                        href: 'https://www.idvroom.com/trajet/' + tripview_id,
                        driver: tripview.querySelector('div.trip-driver a').textContent.trim(),
                        places: (places_span ? places_span.textContent.trim().charAt(0) : '-'),
                        price: li.querySelector('a > span.price').textContent.trim(),
                        departure_hour: li.querySelector('a > span.hour').textContent.trim(),
                        journey: tripview.querySelector('div.trip-journey').textContent.trim().replace(/\s+/, ' -> '),
                    };
                } catch (error) {
                    throw exports.make_error(error, li, tripview);
                }
            }));
            cb_chain.next(exports, rides, query_params);
        },
    ],
});
