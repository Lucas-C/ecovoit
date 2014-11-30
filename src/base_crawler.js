'use strict';

var dom = require('./utils/dom_shorthands.js'),
    errors_utils = require('./utils/errors_utils.js');

module.exports = {
    assert: function () { // args: condition, message, ...
        arguments[1] = this.WEBSITE_URL + ' - ' + arguments[1];
        errors_utils.assert.apply(this, arguments);
    },
    make_error: errors_utils.make_error,
    div_from_html_string: function (html_string) {
        var dom_content = dom.create('div');
        dom_content.innerHTML = html_string
            .replace(/<input[^>]+type=.?password[^>]+>/ig, '')
            .replace(/<img[^>]+>/ig, '');
        // -> Faster + avoid 'loading mixed content' & 'password field present in an insecure HTTP form' console security msgs
        return dom_content;
    },
    is_inspector_mode_on: function (suffix) {
        return (new RegExp('inspector=' + this.TAG_NAME + (suffix || ''))).test(location.search);
    },
};
