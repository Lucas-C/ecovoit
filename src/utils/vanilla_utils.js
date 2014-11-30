'use strict';

var copy_with_enumerable_properties = function (obj) {
    var props = Object.getOwnPropertyNames(obj); // Include non-enumerable properties
    return _.pick(obj, props);
};

exports = module.exports = {
    pretty_string: function (val, indent_prefix) {
        // The problem:
        // - JSON.stringify isn't good to display Errors, RegExps, undefined values
        // and non-plain objects like XMLHttpRequest/HTMLElement
        // - toSource() deals better with them but is non-standard and doesn't provide indentation
        // - JSON.stringify cannot be customized by defining a 'replacer' function
        // as it overrides the default logic that manages arrays & their pretty display,
        // and systematically escape newlines in the 'replacer' output
        //
        // Hence, this is an attempt at a slightly smarter JSON.stringify variant,
        //   not aiming to be matching the JSON spec, simply pretty printing.
        // Note: we could use JXON to e.g. convert Elements to JSON, but KISS my YAGNI
        indent_prefix = indent_prefix || '';
        if (typeof val === 'undefined') {
            return null;
        } else if (_.isString(val)) {
            return '"' + val + '"';
        } else if (val instanceof Error) {
            val = copy_with_enumerable_properties(val);
            if (val.stack) {
                val.stack = val.stack.replace(/</g, '#').split('\n');
            }
            return 'Error(' + exports.pretty_string(val, indent_prefix) + ')';
        } else if (_.isArray(val)) {
            return '[' + _.map(val, function (v) {
                return '\n' + indent_prefix + '  ' + exports.pretty_string(v, indent_prefix + '  ') + '';
        }).join(',') + '\n' + indent_prefix + ']';
        } else if (_.isArguments(val)) {
            return 'Arguments(' + exports.pretty_string(_.toArray(val), indent_prefix) + ')';
        } else if (_.isPlainObject(val)) {
            return '{' + _.map(val, function (v, k) {
                return '\n' + indent_prefix + '  ' + k + ': ' + exports.pretty_string(v, indent_prefix + '  ');
            }).join(',') + '\n' + indent_prefix + '}';
        } else if (val === null) {
            return val;
        }
        return val.toString();
    },
    format: function (string) { // Provide both {0} & {keyword} substitutions, 'à la Python'
        var extra_args = _.tail(arguments);
        if (extra_args.length === 1 && typeof extra_args[0] !== 'string' && !(extra_args[0] instanceof String)) {
            extra_args = extra_args[0];
        }
        _.forIn(extra_args, function (value, key) {
            if (typeof value !== 'undefined') {
                string = string.replace(new RegExp('\\{' + key + '\\}', 'g'), value);
            }
        });
        return string;
    },
    encode_query_params: function (data, encoding_function) {
        encoding_function = encoding_function || encodeURIComponent;
        return _.map(data, function(value, key) {
            return [key, value].map(encoding_function).join('=');
        }).join('&');
    },
    escape_html: function (html_string) {
        // FROM: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
        // Basically does: '&' -> "&amp;", '<' -> '&lt;', '>' -> '&gt;', '"' -> '&quot;', "'" -> '&#39;', '/' -> '&#x2F;'
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(html_string));
        return div.innerHTML;
    },
    // Pseudo-promises:
    execute_callbacks_chain: function (callbacks, abort) {
        if (!callbacks || callbacks.length === 0) {
            return;
        }
        var extra_args = [].slice.call(arguments, 2),
            next_callbacks = callbacks.slice(), // make a copy
            cb_chain = {};
        cb_chain.next = function () {
            var next_callback = next_callbacks.shift();
            if (next_callback) {
                try {
                    _.partial(next_callback, cb_chain).apply(null, arguments);
                } catch (error) {
                    cb_chain.abort(error);
                }
            }
        };
        cb_chain.abort = abort || function () {};
        cb_chain.next.apply(null, extra_args);
    },
};
