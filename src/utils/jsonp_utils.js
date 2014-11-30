'use strict';

var encode_query_params = require('./vanilla_utils.js').encode_query_params,
    jsonp_calls_counter = 0;

exports = module.exports = {
    jsonp: function (request) {
        var script = document.createElement('script'),
            data = _.clone(request.data);
        if (request.success) {
            var callback_func_name = 'jsonp_callback_' + jsonp_calls_counter++;
            window[callback_func_name] = function (server_data) {
                window[callback_func_name] = null;
                request.success(server_data);
            };
            if (!data) { data = {}; }
            data[request.callback_param_name || 'callback'] = callback_func_name;
        }
        script.src = request.url;
        if (data) { script.src += '?' + encode_query_params(data, request.encoding_function);}
        if (request.type !== undefined) { script.type = request.type; }
        if (request.async !== undefined) { script.async = request.async; }
        if (request.defer !== undefined) { script.defer = request.defer; }
        document.body.appendChild(script);
    },
};
