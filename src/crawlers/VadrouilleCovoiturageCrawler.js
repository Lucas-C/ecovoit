'use strict';

var date_utils = require('../utils/date_utils.js'),
    utils = require('../utils/vanilla_utils.js'),
    format = utils.format,
    ajax_proxied = require('../utils/ajax_utils.js').ajax_proxied,
    city_homonyms = require('../utils/homonymous_city_names.js'),
    base_crawler = require('../base_crawler.js'),
    city_info_from_city_result = function (prefix, city_result) {
        var city_info = {};
        city_info[prefix + '_city_name'] = city_result.name;
        city_info[prefix + '_city_id'] = city_result.id;
        return city_info;
    };

exports = module.exports = _.extend({}, base_crawler, {
    DISPLAY_NAME: 'VadrouilleCovoiturage',
    TAG_NAME: 'vadrouille-covoiturage',
    WEBSITE_URL: 'www.vadrouille-covoiturage.com',
    CITY_INFO_URL: 'www.vadrouille-covoiturage.com/ax.php?name=city_complete',
    QUERY_BASE_URL: 'www.vadrouille-covoiturage.com/covoiturage/recherche/resultats.php',
    HIDDEN_COLUMNS: ['date'],
    remote_search_links: function () {
        // 'POST' request mandatory => 'remote_search_links' not usable from the browser of the user
        return null;
    },
    get_base_query_params: function (user_input) {
        var days_difference = date_utils.date_difference_in_days(Date.utc.create(user_input.date, 'fr'), Date.create());
        console.log(exports.WEBSITE_URL + ' - Query date days difference: ', days_difference);
        exports.assert(days_difference % 1 === 0, 'Non-integer difference computed', days_difference);
        exports.assert(days_difference <= 91, 'Dates further than 91 days in the future are not supported');
        return {
            unfolded: 0,
            dep_dist: 50,
            arr_dist: 50,
            date: days_difference,
            dep_hour: '',
            go: '',
            free_places_nb: 1,
            bags_places_nb: 0,
            return_date: 'all',
            arr_hour: '',
            price: '',
            smoking: -1,
            music: -1,
            social: -1,
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
            type: 'POST',
            url: exports.CITY_INFO_URL,
            data: {
                city: query_city_name,
            },
            dataType: 'JSON',
            success: function (data) {
                try {
                    var city_result = exports.parse_city_data(query_city_name, data);
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
    parse_city_data: function (query_city_name, data) {
        var city_info_candidates = null;
        if (data && data.length > 0) {
            city_info_candidates = _.filter(data, function (entry) {
                return entry[2].length <= 5; // discards foreign results like "Espagne, 36969" for Nantes
            });
        }
        exports.assert(city_info_candidates && city_info_candidates.length > 0, 'City name lookup failed');
        city_info_candidates = city_homonyms.get_best_city_info_candidates(
                query_city_name, city_info_candidates, _.pluck(city_info_candidates, 1), _.pluck(city_info_candidates, 2));
        var city_data = city_info_candidates[0],
            city_result = {
                id: city_data[0],
                name: city_data[1],
                postal_code: city_data[2],
            },
            city_candidate_fullnames = _.map(city_info_candidates, function (city_data) {
                return city_data[1] + ' - ' + city_data[2];
            });
        if (city_info_candidates.length > 1) {
            city_homonyms.display_homonyms_warning(exports.WEBSITE_URL, query_city_name, city_candidate_fullnames);
        }
        return city_result;
    },
    CALLBACKS_PIPELINE: [
        function set_phpsessid_cookie (cb_chain, user_input) {
            ajax_proxied({
                url: exports.WEBSITE_URL,
                success: function () {
                    var phpsessid_match = /PHPSESSID=([^;]+)/.exec(document.cookie);
                    if (!phpsessid_match) {
                        cb_chain.abort(new Error('PHPSESSID cookie not set:' + document.cookie));
                    }
                    console.log(format('{0} - PHP session identifier: phpsessid={1}', exports.WEBSITE_URL, phpsessid_match[1]));
                    cb_chain.next(user_input);
                },
                failure: cb_chain.abort,
            });
        },
        function get_departure_city_info (cb_chain, user_input) {
            var dep_city_name = user_input.from_place.replace(/, France$/, '');
            exports.get_city_info(dep_city_name, 'dep', _.partial(cb_chain.next, user_input), cb_chain.abort);
        },
        function get_arrival_city_info (cb_chain, user_input, departure_city_params) {
            var arr_city_name = user_input.to_place.replace(/, France$/, ''),
                base_query_params = exports.get_base_query_params(user_input);
            exports.get_city_info(arr_city_name, 'arr', function (arrival_city_params) {
                cb_chain.next(user_input, _.extend(base_query_params,
                                                   departure_city_params,
                                                   arrival_city_params));
            }, cb_chain.abort);
        },
        function query_search_website (cb_chain, user_input, query_params) {
            ajax_proxied({
                type: 'POST',
                url: exports.QUERY_BASE_URL,
                data: query_params,
                encoding_function: escape, // latin1 / iso-8859-1 encoding : ç -> %E7 not %C3%A7
                success: _.partial(cb_chain.next, user_input, query_params),
                failure: cb_chain.abort,
            });
        },
        function parse_rides_from_response (cb_chain, user_input, query_params, data) {
            if (exports.is_inspector_mode_on()) {
                return cb_chain.abort(data);
            }
            var query_date_string = user_input.date,
                query_date_regex = new RegExp(query_date_string),
                dom_content = exports.div_from_html_string(data),
                is_date_matching_query;
            if (date_utils.is_today(query_date_string)) {
                // jscs: disable validateQuoteMarks
                is_date_matching_query = function (date_string) { return date_string === "Aujourd'hui"; };
                // jscs: enable validateQuoteMarks
            } else if (date_utils.is_tomorrow(query_date_string)) {
                is_date_matching_query = function (date_string) { return date_string === 'Demain'; };
            } else {
                is_date_matching_query = function (date_string) { return query_date_regex.test(date_string); };
            }
            var rides = _.filter(_.map(dom_content.querySelectorAll('#trips_table2 > tbody > tr'), function(tr) {
                try {
                    var result_date = tr.querySelector('td.lieu span.date').textContent;
                    if (!is_date_matching_query(result_date)) {
                        return;
                    }
                    return {
                        href: tr.attributes.onclick.value.match(/location.href='(.*)';/)[1],
                        driver: tr.querySelector('td.eval span.driver_name').textContent,
                        places: +tr.querySelector('td.places span.light').textContent.match(/(\d+) .*/)[1],
                        price: tr.querySelector('td.pricecase span.price').textContent,
                        departure_hour: tr.querySelector('td.lieu table tr:nth-child(1) td.hour').textContent.replace('h', ':'),
                        journey: _.map(tr.querySelectorAll('td.lieu table tr'), function (tr) { return tr.textContent.trim(); }).join(' - '),
                    };
                } catch (error) {
                    throw exports.make_error(error, tr);
                }
            }));
            cb_chain.next(exports, rides, query_params);
        },
    ],
});
