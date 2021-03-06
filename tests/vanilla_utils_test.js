'use strict';

var test = require('./tape-enhanced.js'),
    utils = require('../src/utils/vanilla_utils.js');

test('vanilla_utils-pretty_string-Error', function (t) {
    t.plan(3);
    try {
        throw new Error('[418] Blue Teapot of Death');
    } catch (error) {
        t.equal(error.toString(), 'Error: [418] Blue Teapot of Death', 'toString');
        var detailed_string = utils.pretty_string(error);
        t.ok(/message: "\[418\] Blue Teapot of Death",?\n/.test(detailed_string), '"message" key/pair is in multilines detailed string');
        if (/stack:/.test(detailed_string)) {
            t.ok(/    "[^"]*",?\n/g.exec(detailed_string).length > 0, 'At least one stacktrace line found');
        } else {
            t.skip('Error.stack not supported by this browser');
        }
    }
});

test('vanilla_utils-pretty_string-blend', function (t) {
    t.plan(1);
    var obj = {
        0: null,
        $: undefined,
        a: [NaN, Infinity, arguments],
        d: {0: false, 1: true},
        f: function () { },
        n: 4.2,
        r: /./,
        s: 'string',
        t: document.createElement('script'),
        x: new XMLHttpRequest(),
    },  expected_string = '{\n'
        + '  0: null,\n'
        + '  $: null,\n'
        + '  a: [\n'
        + '    NaN,\n'
        + '    Infinity,\n'
        + '    Arguments([\n'
        + '      [object Object]\n'
        + '    ])\n'
        + '  ],\n'
        + '  d: {\n'
        + '    0: false,\n'
        + '    1: true\n'
        + '  },\n'
        + '  f: function () { },\n'
        + '  n: 4.2,\n'
        + '  r: /./,\n'
        + '  s: "string",\n'
        + '  t: [object HTMLScriptElement],\n'
        + '  x: [object XMLHttpRequest]\n'
        + '}',
        actual_string = utils.pretty_string(obj);
    t.equal(actual_string.replace(/\n"use strict";\n/, ''), expected_string);
});
