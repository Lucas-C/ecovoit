'use strict';

var utils = require('../utils/vanilla_utils.js'),
    format = utils.format,
    ajax_proxied = require('../utils/ajax_utils.js').ajax_proxied,
    base_crawler = require('../base_crawler.js'),
    city_info_from_lat_lng = function (prefix, lat_lng) {
        var city_info = {};
        city_info[prefix + '_LAT'] = lat_lng.lat;
        city_info[prefix + '_LON'] = lat_lng.lon;
        return city_info;
    };

exports = module.exports = _.extend({}, base_crawler, {
    DISPLAY_NAME: 'CovoiturageLibre',
    TAG_NAME: 'covoiturage-libre',
    WEBSITE_URL: 'www.covoiturage-libre.fr',
    INDEX_URL: 'www.covoiturage-libre.fr/index.php',
    QUERY_BASE_URL: 'www.covoiturage-libre.fr/recherche.php',
    NEED_LAT_LNG: true,
    HIDDEN_COLUMNS: ['date'],
    remote_search_links: function () {
        // 'POST' request mandatory => 'remote_search_links' not usable from the browser of the user
        return null;
    },
    get_base_query_params: function (user_input) {
        return {
            DATE_PARCOURS: user_input.date.replace(/\//g, '-'),
            DEPART: user_input.from_place.replace(/, France$/, ''),
            ARRIVEE: user_input.to_place.replace(/, France$/, ''),
            PAYS_DEPART: 'FR',
            PAYS_ARRIVEE: 'FR',
            DEPART_KM: 60, // distance allowed from src place
            ARRIVEE_KM: 60, // distance allowed from dst place
            TRI: 'DATE HEURE',
            TYPE: 'All',
            button: 'Rechercher',
        };
    },
    CALLBACKS_PIPELINE: [
        function get_srctoken_and_set_phpsessid_cookie (cb_chain, user_input, lat_lng) {
            var query_params = _.extend({},
                                        exports.get_base_query_params(user_input),
                                        city_info_from_lat_lng('DEPART', lat_lng.from_place),
                                        city_info_from_lat_lng('ARRIVEE', lat_lng.to_place));
            ajax_proxied({
                url: exports.INDEX_URL,
                success: function (data) {
                    var phpsessid_match = /PHPSESSID=([^;]+)/.exec(document.cookie);
                    if (!phpsessid_match) {
                        cb_chain.abort(new Error('PHPSESSID cookie not set:' + document.cookie));
                    }
                    var phpsessid = phpsessid_match[1],
                        srctoken = /<input id="srctoken" name="srctoken" type="hidden" value="(.+)" \/>/.exec(data)[1];
                    console.log(format('{0} - PHP session identifiers: phpsessid={1} - srctoken={2}',
                                exports.WEBSITE_URL, phpsessid, srctoken));
                    cb_chain.next(_.extend({srctoken: srctoken}, query_params));
                },
                failure: cb_chain.abort,
            });
        },
        function query_search_website (cb_chain, query_params) {
            ajax_proxied({
                method: 'POST',
                url: exports.QUERY_BASE_URL,
                data: query_params,
                mime_type: 'text/html; charset=iso-8859-1',
                success: _.partial(cb_chain.next, query_params),
                failure: cb_chain.abort,
            });
        },
        function parse_rides_from_response (cb_chain, query_params, data) {
            if (exports.is_inspector_mode_on()) {
                return cb_chain.abort(data);
            }
            if (/Malheureusement, aucune annonce n'a .t. trouv.e/.test(data)) {
                console.log(exports.WEBSITE_URL + ' - Zero results found');
                return cb_chain.next(exports, [], query_params);
            }
            var dom_content = exports.div_from_html_string(data),
            rides = _.filter(_.map(dom_content.querySelectorAll('div#contenu table.annonce'), function(table) {
                try {
                    var places_tag = table.querySelector('td:nth-child(1) tr:nth-child(2) td:nth-child(2) strong'),
                        price_tag = table.querySelector('td:nth-child(3) strong');
                    return {
                        href: table.querySelector('td:nth-child(2) p:nth-child(3) a').href.replace(/.*[^\/]\//, 'http://www.covoiturage-libre.fr/'),
                        driver: table.querySelector('td:nth-child(1) tr:nth-child(1) td:nth-child(3)').textContent,
                        places: (places_tag ? places_tag.textContent : null),
                        price: (price_tag ? price_tag.textContent : null),
                        departure_hour: table.querySelector('td:nth-child(2) p:nth-child(2)').childNodes[0].textContent.trim().match(/\d{2}:\d{2}$/)[0],
                        journey: table.querySelector('td:nth-child(2) p:nth-child(1)').textContent,
                    };
                } catch (error) {
                    throw exports.make_error(error, table);
                }
            }));
            cb_chain.next(exports, rides, query_params);
        },
    ],
});
