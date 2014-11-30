'use strict';

var utils = require('../utils/vanilla_utils.js'),
    encode_query_params = utils.encode_query_params,
    format = utils.format,
    ajax_utils = require('../utils/ajax_utils.js'),
    ajax_proxied = ajax_utils.ajax_proxied,
    base_crawler = require('../base_crawler.js'),
    city_info_from_lat_lng = function (prefix, lat_lng) {
        var city_info = {};
        city_info[prefix + '_lat'] = lat_lng.lat;
        city_info[prefix + '_long'] = lat_lng.lon;
        city_info[prefix + '_bounds'] = '[[' + (lat_lng.lat - 0.05) + ', ' + (lat_lng.lon - 0.05) + '],'
                                      + ' [' + (lat_lng.lat + 0.05) + ', ' + (lat_lng.lon + 0.05) + ']]';
        return city_info;
    };

exports = module.exports = _.extend({}, base_crawler, {
    DISPLAY_NAME: 'Carpooling',
    TAG_NAME: 'carpooling',
    WEBSITE_URL: 'www.carpooling.fr',
    QUERY_BASE_URL: 'www.carpooling.fr/search/search',
    NEED_LAT_LNG: true,
    HIDDEN_COLUMNS: ['date', 'journey'],
    remote_search_links: function (query_params) {
        return format('http://{0}?{1}', exports.QUERY_BASE_URL, encode_query_params(query_params));
    },
    get_base_query_params: function (user_input) {
        return {
            from_address: user_input.from_place,
            from_changed: '',
            from_country: 'FR',
            from_city: user_input.from_place.replace(/, France$/, ''),
            from_street: '',
            from_types: 'locality,political',
            to_address: user_input.to_place,
            to_changed: '',
            to_country: 'FR',
            to_city: user_input.to_place.replace(/, France$/, ''),
            to_street: '',
            to_types: 'locality,political',
            full_date: user_input.date,
        };
    },
    CALLBACKS_PIPELINE: [
        function query_search_website (cb_chain, user_input, lat_lng) {
            var query_params = _.extend({},
                                        exports.get_base_query_params(user_input),
                                        city_info_from_lat_lng('from', lat_lng.from_place),
                                        city_info_from_lat_lng('to', lat_lng.to_place));
            ajax_proxied({
                url: exports.QUERY_BASE_URL,
                data: query_params,
                success: _.partial(cb_chain.next, user_input, query_params),
                failure: cb_chain.abort,
            });
        },
        function parse_rides_from_response (cb_chain, user_input, query_params, data) {
            if (exports.is_inspector_mode_on()) {
                return cb_chain.abort(data);
            }
            if (/D.sol., aucun trajet n'est disponible pour le moment/.test(data)) {
                console.log(exports.WEBSITE_URL + ' - Zero results found');
                return cb_chain.next(exports, [], query_params);
            }
            var dom_content = exports.div_from_html_string(data),
                header_date = user_input.date.replace('/', '.').substring(0, 5),
                headline = _.find(dom_content.querySelectorAll('#searchResultsList .headline'), function(headline) {
                    if (headline.textContent.trim().indexOf(header_date) !== -1) {
                        return true;
                    }
                });
            if (!headline) {
                console.log(exports.WEBSITE_URL + ' - Zero results found for the correct day');
                return cb_chain.next(exports, [], query_params);
            }
            var table_result = headline.nextSibling;
            exports.assert(table_result.className.split(' ')[0] === 'js_table_result',
                    'HTML structure changed: #searchResultsList .headline sibling is no more a .js_table_result');
            var rides = _.filter(_.map(table_result.querySelectorAll('tr'), function(tr) {
                try {
                    return {
                        href: tr.querySelector('td.start a').href.replace(/^https?:\/\/[^\/]+/, 'http://www.carpooling.fr'),
                        driver: tr.querySelector('td.driver .user .name').textContent.trim(),
                        places: tr.querySelector('td.price p:nth-child(2)').textContent.trim().split(' ')[0],
                        price: tr.querySelector('td.price p:nth-child(1)').textContent.trim(),
                        departure_hour: tr.querySelector('td.departure p').textContent.trim(),
                    };
                } catch (error) {
                    throw exports.make_error(error, tr);
                }
            }));
            cb_chain.next(exports, rides, query_params);
        },
    ],
});
