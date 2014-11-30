'use strict';

var utils = require('../utils/vanilla_utils.js'),
    encode_query_params = utils.encode_query_params,
    format = utils.format,
    ajax_proxied = require('../utils/ajax_utils.js').ajax_proxied,
    base_crawler = require('../base_crawler.js');

exports = module.exports = _.extend({}, base_crawler, {
    DISPLAY_NAME: 'Blablacar',
    TAG_NAME: 'blablacar',
    WEBSITE_URL: 'www.covoiturage.fr',
    QUERY_BASE_URL: 'www.covoiturage.fr/search_xhr',
    HIDDEN_COLUMNS: ['date'],
    remote_search_links: function (query_params) {
        return format('http://{0}/search?{1}', exports.WEBSITE_URL, encode_query_params(query_params));
    },
    get_query_params: function (user_input) {
        return {
            fn: user_input.from_place,
            tn: user_input.to_place,
            db: user_input.date,
            hb: user_input.departure_hour_min || 5,
            he: user_input.departure_hour_max || 24,
            limit: 30, // results per query
        };
    },
    CALLBACKS_PIPELINE: [
        function query_search_website (cb_chain, user_input) {
            var query_params = exports.get_query_params(user_input);
            ajax_proxied({
                url: exports.QUERY_BASE_URL,
                data: query_params,
                dataType: 'JSON',
                success: _.partial(cb_chain.next, user_input, query_params),
                failure: cb_chain.abort,
            });
        },
        function parse_rides_from_response (cb_chain, user_input, query_params, data) {
            exports.assert(data.html, 'Non-conform response: no .html', data);
            var results = data.html.results;
            exports.assert(results, 'Empty query response', data);
            if (exports.is_inspector_mode_on()) {
                return cb_chain.abort(results);
            }
            var dom_content = exports.div_from_html_string(results),
            rides = _.filter(_.map(dom_content.querySelectorAll('ul.trip-search-results li'), function(li) {
                var search_result_a = li.querySelector('a.trip-search-oneresult');
                if (!search_result_a) {
                    console.log(exports.WEBSITE_URL + ' - Uncommon search result found:', li);
                    return;
                }
                try {
                    var journey = li.querySelector('div.description > h3.fromto').textContent.trim(),
                        car_type_dl = li.querySelector('div.description > dl.car-type'),
                        time = li.querySelector('div.description h3.time').textContent.trim().match(/\d{2}h(\d{2})?$/g)[0];
                    time = time.substring(0, 2) + ':' + (time.length > 3 ? time.substring(3, 5) : '00');
                    if (car_type_dl) {
                        journey += '<br>' + car_type_dl.textContent.trim();
                    }
                    return {
                        href: search_result_a.href
                                             .replace(/.*[^\/]\//, 'http://www.covoiturage.fr/'),
                        departure_hour: time,
                        price: li.querySelector('div.price').textContent.trim()
                                 .replace(/ par place$/, ''),
                        places: li.querySelector('div.availability').textContent.trim()
                                  .replace(/ places? restantes?$/, ''),
                        driver: li.querySelector('div.user-info').textContent.trim()
                                  .replace(/ (\d+) ans[\s\S]*$/m, '<br>$1 ans'), // Stripping the Blablacar 'level' at the end
                        journey: journey,
                    };
                } catch (error) {
                    throw exports.make_error(error, li);
                }
            }));
            rides = _.filter(rides, function (ride) {
                return ride.places !== 'Complet';
            });
            cb_chain.next(exports, rides, query_params);
        },
    ],
});
