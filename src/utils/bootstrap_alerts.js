'use strict';

var dom = require('./dom_shorthands.js'),
    utils = require('./vanilla_utils.js'),
    ALERT_TEMPLATE = dom.byId('alert-template').textContent.trim();

exports = module.exports = {
    // Allowed alert_types : alert-success, alert-info, alert-warning, alert-danger
    display: function (message, alert_type, html_tag, parent_node) {
        var new_alert_div = exports.create(message, alert_type, html_tag);
        (parent_node || dom.byId('alert-messages')).appendChild(new_alert_div);
    },
    create: function (message, alert_type, html_tag) {
        return dom.create_from_string(utils.format(ALERT_TEMPLATE, {
            message: message,
            alert_type: alert_type || 'alert-danger',
            html_tag: html_tag || 'span'
        }));
    },
    clear_all: function() {
        dom.remove_all_children(dom.byId('alert-messages'));
    },
};
