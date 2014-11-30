'use strict';

var epoch_beginning_of_day_utc_time_offset = Date.utc.create('1/01/1970').beginningOfDay().getTime();
// !== Date.create(0).beginningOfDay().getTime()

exports = module.exports = {
    format_date_string: function (date, separator) {
        var dd = date.getDate();
        var mm = date.getMonth() + 1; //January is 0!
        var yyyy = date.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        return dd + separator + mm + separator + yyyy;
    },
    date_to_days_count: function (date) {
        var time = date.beginningOfDay().getTime();
        if (!date.isUTC()) {
            time -= epoch_beginning_of_day_utc_time_offset;
        }
        return time / 86400000; // 24 * 60 * 60 * 1000
    },
    date_difference_in_days: function (date1, date2) { // computes $date1 minus $date2
        return exports.date_to_days_count(date1) - exports.date_to_days_count(date2);
    },
    is_today: function (date_string) {
        return date_string === exports.format_date_string(Date.create().beginningOfDay(), '/');
    },
    is_tomorrow: function (date_string) {
        return date_string === exports.format_date_string(Date.create().addDays(1).beginningOfDay(), '/');
    },
};
