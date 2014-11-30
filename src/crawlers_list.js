'use strict';

var AVAILABLE_CRAWLERS = [
        require('./crawlers/BlablacarCrawler.js'),
        require('./crawlers/CarpoolingCrawler.js'),
        require('./crawlers/CovoiturageLibreCrawler.js'),
        require('./crawlers/IdVroomCrawler.js'),
        require('./crawlers/LeBonCoinCrawler.js'),
        require('./crawlers/VadrouilleCovoiturageCrawler.js'),
    ],
    TAGNAME_TO_CRAWLER_MAP = _.transform(AVAILABLE_CRAWLERS, function (output, crawler, index) {
        output[crawler.TAG_NAME] = {
            crawler: crawler,
            index: index,
        };
    });

module.exports = {
    AVAILABLE_CRAWLERS: AVAILABLE_CRAWLERS,
    available_crawlers_tagnames: function () {
        return _.keys(TAGNAME_TO_CRAWLER_MAP);
    },
    tagname_to_crawler: function (tagname) {
        return TAGNAME_TO_CRAWLER_MAP[tagname].crawler;
    },
    tagname_to_index: function (tagname) {
        return TAGNAME_TO_CRAWLER_MAP[tagname].index;
    },
};
