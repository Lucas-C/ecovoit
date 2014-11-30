'use strict';
// Note: failures are caught using both xhr.onerror & xhr.status !== 200
// A 3rd solution would be to define window.onerror (message, file, lineNumber) { ... }
var config = require('../config.js'),
    utils = require('./vanilla_utils.js'),
    format = utils.format,
    encode_query_params = utils.encode_query_params,
    errors_utils = require('./errors_utils.js'),
    throw_ajax_error = function (request, error_name) {
        if (request.error_thrown) {
            return;
        }
        request.error_thrown = errors_utils.make_error(error_name + ' [' + request.xhr.status + '] : "'
            + request.xhr.statusText + '" - "' + request.xhr.responseText + '"', request);
        if (request.failure) {
            request.failure(request.error_thrown);
        } else {
            throw request.error_thrown;
        }
    };

exports = module.exports = {
    ajax: function (settings) { // jshint maxcomplexity: 7
        var request = _.extend({
            type: 'get',
            full_url: settings.url,
            post_data: null,
            xhr: new XMLHttpRequest(),
        }, settings);
        request.type = request.type.toUpperCase();
        if (request.type === 'GET' && !_.isEmpty(request.data)) {
            request.full_url += '?' + encode_query_params(request.data, request.encoding_function);
        }
        request.xhr.open(request.type, request.full_url, true); // async=true
        if (request.type === 'POST') {
            // Do NOT set the 'Content-Type' header manually, so that the browser append the correct one:
            // 'application/x-www-form-urlencoded' or 'multipart/form-data; boundary='
            if (request.data && request.multipart) {
                request.post_data = new FormData();
                _.forOwn(request.data, function (value, key) {
                    request.post_data.append(key, value);
                });
            } else {
                request.xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                request.post_data = (request.data ? encode_query_params(request.data, request.encoding_function).replace(/%20/g, '+') : null);
            }
        }
        if (request.mime_type) {
            if (request.xhr.overrideMimeType) {
                request.xhr.overrideMimeType(request.mime_type);
            } else {
                console.log('WARNING: XMLHttpRequest.overrideMimeType not supported by this browser', request);
            }
        }
        request.xhr.onerror = function () {
            throw_ajax_error(request, 'AJAX error event');
        };
        request.xhr.onreadystatechange = function () {
            if (request.xhr.readyState !== 4) {
                return;
            }
            if (request.xhr.status !== 200) {
                throw_ajax_error(request, 'AJAX request event');
                return;
            }
            if (request.dataType && request.dataType.toUpperCase() === 'JSON') {
                request.success(JSON.parse(request.xhr.responseText), request.xhr);
            } else {
                request.success(request.xhr.responseText, request.xhr);
            }
        };
        request.xhr.send(request.post_data);
    },
    ajax_proxied: function (request) {
        if (/debug=true/.test(location.search)) {
            console.log(request);
        }
        // Note: for a yet unknown reason, using a purely relative 'proxy/' + ... path
        // revealed to be troublesome when re-submitting a search
        var dirpath = _.initial(location.href.split('/')).join('/'),
            proxy_path = dirpath + config.SERVER_PATH_TO_PROXY;
        return exports.ajax(_.extend(request, {url: proxy_path + request.url}));
    },
    ajax_yql: function (request) { // jshint maxcomplexity: 7
        var orig_success_callback = request.success || request.complete,
            orig_datatype = request.dataType,
            orig_url = 'http://' + request.url;
        errors_utils.assert(!orig_datatype || /(html|json)/i.test(orig_datatype), 'Untested dataType', request);
        request.url = 'http' + (/^https/.test(location.protocol) ? 's' : '') + '://query.yahooapis.com/v1/public/yql';
        request.dataType = 'json';
        request.data = {
            q: format('select content from data.headers where url="{url}"', {url:
                orig_url + (request.data ?
                    (/\?/.test(orig_url) ? '&' : '?') + encode_query_params(request.data, request.encoding_function)
                    : '')
            }),
            format: 'json',
            env: 'store://datatables.org/alltableswithkeys',
            diagnostics: 'true',
        };
        request.success = function (data, textStatus, jqXHR) {
            var results = data.query.results;
            errors_utils.assert(results, 'Yahoo API query error - no results: ', data, jqXHR);
            var content = results.resources.content;
            errors_utils.assert(content, 'Yahoo API query error - no content: ', data, jqXHR);
            orig_success_callback(/json/i.test(orig_datatype) ? content.json : content);
        };
        return exports.ajax(request);
    },
};
