'use strict';

var errors_utils = require('./errors_utils.js'),
    GEOCODER = null,
    extract_geometry_location = function (place, autocomplete, callback) {
        var place_result = autocomplete.getPlace();
        if (false && place_result) {
            console.log('AUTOCOMPLETE:', place_result);
            callback(place_result.geometry.location);
            return;
        }
        var request = {
                address: place,
                componentRestrictions: {country: 'fr'},
            };
        if (!GEOCODER) {
            GEOCODER = new google.maps.Geocoder();
        }
        // NOTE: Currently city homonys & invalid queries (eg. ABC) returning valid results are not managed properly.
        // This is not a big pain because 90% of the time the autocompleter _SHOULD_ signal those to the user
        GEOCODER.geocode(request, function(results, status) {
            console.log('GEOCODER:', results);
            if (status !== google.maps.GeocoderStatus.OK) {
                throw errors_utils.make_error('Geocoding request failed: status code =' + status, results);
            } else if (results[0].address_components.length < 4) {
                throw errors_utils.make_error('Geocoding request failed: the location matched is too generic', results);
            }
            callback(results[0].geometry.location);
        });
    };

exports = module.exports = {
    AUTOCOMPLETE: {},
    LAT_LNG_CACHE: {},
    init: function (from_input, to_input) {
        var gmpa_options = {
                types: ['geocode'],
                componentRestrictions: {country: 'fr'},
            };
        exports.AUTOCOMPLETE.from_place = new google.maps.places.Autocomplete(from_input, gmpa_options);
        exports.AUTOCOMPLETE.to_place = new google.maps.places.Autocomplete(to_input, gmpa_options);
    },
    get_from_to_lat_lng: function (user_input, callback) {
        exports.get_lat_lng_with_caching(user_input.from_place, exports.AUTOCOMPLETE.from_place, function (from_lat_lng) {
            exports.get_lat_lng_with_caching(user_input.to_place, exports.AUTOCOMPLETE.to_place, function (to_lat_lng) {
                callback({
                    from_place: from_lat_lng,
                    to_place: to_lat_lng,
                });
            });
        });
    },
    get_lat_lng_with_caching: function (place, autocomplete, callback) {
        var lat_lng_from_cache = exports.LAT_LNG_CACHE[place];
        if (lat_lng_from_cache) {
            callback(lat_lng_from_cache);
            return;
        }
        extract_geometry_location(place, autocomplete, function (geometry_location) {
            var lat_lng = {
                lat: geometry_location.k,
                lon: geometry_location.D,
            };
            exports.LAT_LNG_CACHE[place] = lat_lng;
            callback(lat_lng);
        });
    },
};
