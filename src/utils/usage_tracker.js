'use strict';

global._paq = global._paq || []; // required to be global by Piwik
var config = require('../config.js'),
    is_today = require('./date_utils.js').is_today,
    jsonp = require('./jsonp_utils.js').jsonp,
    async_push_paq = function() {
        _paq.push(['trackPageView']);
        if (!config.ENABLE_USAGE_TRACKER) { return; }
        jsonp({
            url: config.SERVER_PATH_TO_PIWIK + 'piwik.js',
            type: 'text/javascript',
            async: true,
            defer: true,
        });
    };

module.exports = {
    record_page_view: function () {
        _paq.push(['setTrackerUrl', config.SERVER_PATH_TO_PIWIK + 'piwik.php']);
        _paq.push(['setSiteId', 1]);
        _paq.push(['enableLinkTracking']);
        async_push_paq();
    },
    record_error: function (details) {
        _paq.push(['setCustomVariable', 1, 'error', details, 'page']);
        async_push_paq();
    },
    record_site_search: function (user_input, enabled_crawlers_tagnames) {
        _paq.push(['setCustomVariable', 2, 'from_place', user_input.from_place, 'page']);
        _paq.push(['setCustomVariable', 3, 'to_place', user_input.to_place, 'page']);
        _paq.push(['setCustomVariable', 4, 'is_date_picked_today', is_today(user_input.date), 'page']);
        _paq.push(['setCustomVariable', 5, 'enabled_crawlers', enabled_crawlers_tagnames.join('-'), 'page']);
        async_push_paq();
    },
    record_site_results: function (crawler_tag_name, crawler_index, results_count) {
        _paq.push(['setCustomVariable', 6 + crawler_index, crawler_tag_name + '_rides_count', results_count, 'page']);
        async_push_paq();
    },
};
