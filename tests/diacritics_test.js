'use strict';

var test = require('./tape-enhanced.js'),
    diacritics = require('../src/utils/diacritics.js');

test('diacritics-remove_from', function (t) {
    t.plan(1);
    t.equal(diacritics.remove_from('Àà, Ââ, Ææ, '   + 'Ää, Çç, Éé, Èè, Êê, Ëë, Îî, Ïï, Ôô, Œœ, '   + 'Öö, Ùù, Ûû, Üü, Ÿÿ'),
                                   'Aa, Aa, AEae, ' + 'Aa, Cc, Ee, Ee, Ee, Ee, Ii, Ii, Oo, OEoe, ' + 'Oo, Uu, Uu, Uu, Yy');
});
