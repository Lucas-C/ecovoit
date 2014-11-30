'use strict';

var dom = require('./dom_shorthands.js'),
    utils = require('./vanilla_utils.js'),
    bs_alerts = require('./bootstrap_alerts.js'),
    tracker = require('./usage_tracker.js'),
    ERROR_MSG_TEMPLATE = dom.byId('error-msg-template').textContent.trim(),
    error_msg_counter = 0;

exports = module.exports = {
    make_error: function () {
        var string_message = _.map(arguments, function (arg) {
            console.log(arg);
            return (_.isString(arg) ? arg : utils.escape_html(utils.pretty_string(arg)));
        }).join(' - ');
        return new Error(string_message);
    },
    display_error: function (error, parent_node) {
        var details = utils.escape_html(utils.pretty_string(error)),
            error_msg = 'Une erreur est survenue';
        tracker.record_error(details);
        if (error.city_name) {
            error_msg += ' - le site web ne reconnaît pas cet endroit: ' + error.city_name;
        } else if (error.request) {
            error_msg += ' - la requête AJAX a échoué';
        }
        error_msg += ' - ' + utils.format(ERROR_MSG_TEMPLATE, {id: error_msg_counter++, details:details});
        console.log(error_msg);
        bs_alerts.display(error_msg, 'alert-danger', 'span', parent_node);
    },
    assert: function (condition, message) {
        if (!condition) {
            message = 'Assert failed' + (typeof message !== 'undefined' ? ': ' + message : '');
            throw exports.make_error.apply(exports, _.tail(arguments));
        }
    },
    // Errors are duck-typed:
    //  a .city_name attribute indicate a city lookup error
    //  a .request attribute indicates an AJAX request error
};
