'use strict';

var dom = require('./utils/dom_shorthands.js'),
    utils = require('./utils/vanilla_utils.js'),
    bs_alerts = require('./utils/bootstrap_alerts.js'),
    errors_utils = require('./utils/errors_utils.js'),
    tracker = require('./utils/usage_tracker.js'),
    crawlers_list = require('./crawlers_list.js'),
    format = utils.format,
    RESULTS_DIV_TEMPLATE = dom.byId('crawler-results-template').innerHTML,
    // jscs: disable validateQuoteMarks
    ZERO_RESULTS_WARNING_MSG = "Aucun résultat correspondant à votre requête n'a été trouvé",
    // jscs: enable validateQuoteMarks
    create_results_div = function (crawler) {
        var results_div = dom.create_from_string(format(RESULTS_DIV_TEMPLATE, crawler));
        dom.byId('results-viewer').appendChild(results_div);
    },
    hide_results_div_children = function (crawler) {
        _.forEach(dom.selectAll(format('#{TAG_NAME}-results .not-hidden', crawler)), function (element) {
            dom.class_list_replace(element, 'not-hidden', 'hidden');
        });
    },
    update_progress_bar = function (crawler_tagname, progress) {
        var progress_bar = dom.select('#' + crawler_tagname + '-progress-bar > div > div > div');
        progress = Math.floor(progress);
        progress_bar.style = (progress > 0 ? 'width: ' + progress + '%' : 'min-width: 2em');
        progress_bar.setAttribute('aria-valuenow', progress);
        progress_bar.textContent = progress + '%';
    },
    init_navbar_and_progress_bar = function (crawler) {
        dom.class_list_replace(dom.select(format('#{TAG_NAME}-results > nav', crawler)), 'hidden', 'not-hidden');
        dom.class_list_replace(dom.byId(format('{TAG_NAME}-progress-bar', crawler)), 'hidden', 'not-hidden');
        update_progress_bar(crawler.TAG_NAME, 0);
    },
    display_zero_results_message = function (crawler) {
        dom.byId(format('{TAG_NAME}-results', crawler)).appendChild(bs_alerts.create(ZERO_RESULTS_WARNING_MSG, 'alert-warning'));
    },
    remove_all_alert_messages = function (crawler) {
        _.forEach(dom.selectAll(format('#{TAG_NAME}-results > .alert', crawler)), function (element) {
            element.parentNode.removeChild(element);
        });
    },
    bootstrap_table_init = function (crawler) {
        var table_elem = jQuery(format('#{TAG_NAME}-results-table', crawler));
        table_elem.bootstrapTable({
            sortName: crawler.SORT_NAME || 'departure_hour',
            sortOrder: crawler.SORT_ORDER || 'asc',
            onClickRow: function (ride) {
                window.open(ride.href, '_bank');
            }
        });
        var bs_table = table_elem.data('bootstrap.table');
        crawler.HIDDEN_COLUMNS.map(bs_table.hideColumn.bind(bs_table));
        return bs_table;
    },
    populate_results_table = function (crawler, rides) {
        dom.class_list_replace(dom.byId(format('{TAG_NAME}-results-table-pager', crawler)), 'hidden', 'not-hidden');
        var bs_table = bootstrap_table_init(crawler);
        bs_table.load(rides);
    },
    add_links_to_remote_searches = function (crawler, query_params) {
        var search_links_span = dom.select(format('#{TAG_NAME}-results > nav > span', crawler)),
            search_links = crawler.remote_search_links(query_params);
        if (!search_links) {
            return;
        }
        dom.class_list_replace(search_links_span, 'hidden', 'not-hidden');
        if (_.isString(search_links)) {
            search_links_span.innerHTML = '<a href="' + search_links + '" target="_blank">'
                + 'Lien pour rechercher directement sur le site</a>';
        } else {
            search_links_span.innerHTML = 'Liens pour rechercher directement sur le site: '
                + _.map(search_links, function (href, search_name) {
                    return '<a href="' + href + '" target="_blank">' + search_name + '</a>';
                }).join(' - ');
        }
    };

exports = module.exports = {
    init: function () {
        var available_crawlers = _.map(crawlers_list.available_crawlers_tagnames(), crawlers_list.tagname_to_crawler);
        available_crawlers.forEach(create_results_div);
    },
    search_all: function (available_crawlers, enabled_crawlers, user_input, lat_lng) {
        available_crawlers.forEach(remove_all_alert_messages);
        available_crawlers.forEach(hide_results_div_children);
        enabled_crawlers.forEach(init_navbar_and_progress_bar);
        enabled_crawlers.forEach(_.partial(exports.make_search, user_input, lat_lng));
    },
    make_search: function (user_input, lat_lng, crawler) {
        var callback_index = 0,
            intermediate_callback = function (cb_chain) {
                update_progress_bar(crawler.TAG_NAME, ++callback_index * 100.0 / crawler.CALLBACKS_PIPELINE.length);
                cb_chain.next.apply(null, _.tail(arguments));
            },
            intermediate_callbacks = _.times(crawler.CALLBACKS_PIPELINE.length - 1, _.constant(intermediate_callback));
        intermediate_callbacks.push(exports.display_results);
        var abort = _.partial(exports.handle_search_pipeline_abort, crawler),
            callbacks = _.flatten(_.zip(crawler.CALLBACKS_PIPELINE, intermediate_callbacks));
        /* Now 'callbacks' is made of: [
         *  crawler_callback1
         *  intermediate_callback
         *  crawler_callback2
         *  intermediate_callback
         *  ...
         *  last_crawler_callback
         *  populate_results_table
         * ] */
        utils.execute_callbacks_chain(callbacks, abort, user_input, lat_lng);
    },
    display_results: function (cb_chain, crawler, rides, query_params) {
        var crawler_index = crawlers_list.tagname_to_index(crawler.TAG_NAME);
        tracker.record_site_results(crawler.TAG_NAME, crawler_index, rides.length);
        hide_results_div_children(crawler);
        dom.class_list_replace(dom.select(format('#{TAG_NAME}-results > nav', crawler)), 'hidden', 'not-hidden');
        if (rides.length > 0) {
            populate_results_table(crawler, rides);
        } else {
            display_zero_results_message(crawler);
        }
        if (query_params) {
            add_links_to_remote_searches(crawler, query_params);
        }
    },
    handle_search_pipeline_abort: function (crawler, arg) {
        hide_results_div_children(crawler);
        dom.class_list_replace(dom.select(format('#{TAG_NAME}-results > nav', crawler)), 'hidden', 'not-hidden');
        if (arg instanceof Error) {
            var error = arg,
                parent_node = dom.byId(format('{TAG_NAME}-results', crawler));
            errors_utils.display_error(error, parent_node);
        } else { // debug "inspector" mode
            console.log('Inspector mode ON', arg);
            var html_content = (typeof arg === 'string' ? arg : '<pre>' + JSON.stringify(arg, null, 2) + '</pre>');
            var div = dom.create('div');
            div.innerHTML = html_content;
            div.className = 'not-hidden';
            dom.byId(format('{TAG_NAME}-results', crawler)).appendChild(div);
        }
    },
};
