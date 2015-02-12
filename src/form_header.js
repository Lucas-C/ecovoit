'use strict';

var dom = require('./utils/dom_shorthands.js'),
    utils = require('./utils/vanilla_utils.js'),
    date_utils = require('./utils/date_utils.js'),
    bs_alerts = require('./utils/bootstrap_alerts.js'),
    errors_utils = require('./utils/errors_utils.js'),
    cookies_mgr = require('./utils/cookies_mgr.js'),
    autocomplete_geocoder = require('./utils/google_autocomplete_geocoder.js'),
    tracker = require('./utils/usage_tracker.js'),
    crawlers_list = require('./crawlers_list.js'),
    USAGE_MESSAGE = dom.byId('usage-message').textContent.trim();

exports = module.exports = {
    init: function (results_viewer) {
        var from_input = dom.byId('from-place'),
            to_input = dom.byId('to-place');

        autocomplete_geocoder.init(from_input, to_input);

        dom.select('.navbar-form button').onclick = _.partial(exports.onsubmit, crawlers_list, results_viewer);

        // Setting default date
        dom.byId('date-selected').value = date_utils.format_date_string(Date.create().beginningOfDay(), '/');
        // Starting date picker
        jQuery('#date-picker').datepicker({
            language: 'fr',
            todayHighlight: true,
            keyboardNavigation: false,
        });

        // Hack to override the 'ENTER' key behaviour - cf. bootstrap-datepicker.js:1193
        dom.byId('date-selected').onkeydown = function (ev) {
            if (ev.which === 13) {
                var dp = jQuery('#date-picker').data('datepicker');
                // 1: we manually restore the input date so it's not toggled on/off
                dp.dates.pop();
                dp.dates.push(dp.viewDate);
                dp.setValue();
                // 2: we move to the next input field & close the picker
                dom.byId('from-place').focus();
                dp.hide();
            }
        };

        _.forEach({
            'departure-hour-min': 'departure-hour-max',
            'departure-hour-max': 'from-place',
            'from-place': 'to-place',
        }, function (input_next, input_src) {
            dom.byId(input_src).onkeypress = function (ev) { // using event namespace
                if (ev.which === 13) {
                    ev.preventDefault();
                    dom.byId(input_next).focus();
                }
            };
        });

        from_input.focus();

        var enabled_crawlers_tagnames = cookies_mgr.get_json('enabled_crawlers_tagnames') || crawlers_list.available_crawlers_tagnames();
        exports.populate_crawlers_list(crawlers_list, enabled_crawlers_tagnames);
    },
    onsubmit: function (crawlers_list, results_viewer, evt) {
        evt.preventDefault();
        var user_input = {
            date: dom.byId('date-selected').value,
            departure_hour_min: dom.byId('departure-hour-min').value,
            departure_hour_max: dom.byId('departure-hour-max').value,
            from_place: dom.byId('from-place').value,
            to_place: dom.byId('to-place').value,
        };
        if (!user_input.from_place || !user_input.to_place) {
            bs_alerts.display('Précisez une adresse de départ et d\'arrivée SVP.', 'alert-warning');
            return;
        }
        var available_crawlers = _.map(crawlers_list.available_crawlers_tagnames(), crawlers_list.tagname_to_crawler),
            enabled_crawlers_tagnames = exports.get_enabled_crawlers_tagnames_from_checkboxes(),
            enabled_crawlers = _.map(enabled_crawlers_tagnames, crawlers_list.tagname_to_crawler);
        if (enabled_crawlers.length === 0) {
            bs_alerts.display('Au moins un site doit être sélectionné', 'alert-warning');
            return;
        }
        cookies_mgr.set_json('enabled_crawlers_tagnames', enabled_crawlers_tagnames);

        bs_alerts.clear_all();
        if (!cookies_mgr.get_json('usage-message-dismissed')) {
            bs_alerts.display(USAGE_MESSAGE, 'alert-info');
            dom.select('.alert > button').onclick = function () {
                cookies_mgr.set_json('usage-message-dismissed', true);
            };
        }

        tracker.record_site_search(user_input, enabled_crawlers_tagnames);

        var lat_lng_needed = _.any(_.pluck(enabled_crawlers, 'NEED_LAT_LNG'));
        if (lat_lng_needed) {
            autocomplete_geocoder.get_from_to_lat_lng(user_input, function (lat_lng) {
                results_viewer.search_all(available_crawlers, enabled_crawlers, user_input, lat_lng);
            });
        } else {
            results_viewer.search_all(available_crawlers, enabled_crawlers, user_input, null);
        }
    },
    populate_crawlers_list: function (crawlers_list, enabled_crawlers_tagnames) {
        var ul = dom.byId('enabled-crawlers-list');
        crawlers_list.available_crawlers_tagnames().forEach(function (tagname) {
            var crawler = crawlers_list.tagname_to_crawler(tagname);
            ul.appendChild(dom.create_from_string(
                '<li style="text-align:left">'
                    + '<input type="checkbox" id="enable-crawler-' + tagname + '"'
                        + (enabled_crawlers_tagnames.indexOf(tagname) !== -1 ? ' checked="checked"' : '')
                    + '> '
                    + utils.format('<a href="http://{WEBSITE_URL}">{DISPLAY_NAME} ({WEBSITE_URL})</a>', crawler)
                + '</li>'));
        });
    },
    get_enabled_crawlers_tagnames_from_checkboxes: function () {
        return _.filter(_.map(dom.selectAll('ul#enabled-crawlers-list > li > input'), function (input) {
            var crawler_tag_name = input.id.match('enable-crawler-(.*)')[1];
            errors_utils.assert(input.type === 'checkbox' && crawler_tag_name);
            return (input.checked ? crawler_tag_name : null);
        }));
    },
};
