'use strict';
var tape_test = require('tape');
module.exports = function () {
    // If a query string is provided, use it as a regular expression to filter tests to execute
    if (location.search) {
        var regex = location.search.substring(1); // Skipping '?'
        if ((new RegExp(regex)).test(arguments[0])) {
            console.log('Executing test matching regex: ', regex);
        } else {
            return;
        }
    }
    return tape_test.apply(this, arguments);
};
