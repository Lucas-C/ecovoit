'use strict';

var dom = require('./dom_shorthands.js'),
    city_homonyms = require('../utils/homonymous_city_names.js'),
    GMPP_SERVICE = null,
    create_gmpp_service = function () {
        return new google.maps.places.PlacesService(
            new google.maps.Map(dom.byId('map'), {
                center: new google.maps.LatLng(47.369444, 2.0365905), // center of France
                zoom: 5,
            })
        );
    },
    get_best_city_result = function (city_name, city_results) {
        var city_data;
        if (city_results.length === 1) {
            city_data = city_results[0];
        } else {
            var best_city_candidates = city_homonyms.get_best_city_info_candidates(
                    city_name, city_results, _.pluck(city_results, 'name'), null);
            city_data = best_city_candidates[0];
            if (best_city_candidates.length > 1) {
                city_homonyms.display_homonyms_warning('google_places_atlas',
                        city_name, _.pluck(best_city_candidates, 'name'), city_data.name);
            }
        }
        return {
            name: city_data.name,
            lat: city_data.geometry.location.k,
            lon: city_data.geometry.location.D,
        };
    };

exports = module.exports = {
    city_cache: {}, // each entry has only one of the following properties:
        // .callbacks : queue of callbacks to process -> defined while async lookup is in progress
        // .city_result : {.name .lat .lon} -> defined once async lookup is done
        // NOTE: errors are cached too
    city_lookup: function (city_name, callback) {
        var city_cache_entry = exports.city_cache[city_name];
        if (city_cache_entry) {
            if (city_cache_entry.city_result) {
                if (/debug=true/.test(location.search)) {
                    console.log('google_places_atlas - Successful cache hit for ' + city_name);
                }
                callback(city_cache_entry.city_result);
            } else {
                city_cache_entry.callbacks.push(callback);
                if (/debug=true/.test(location.search)) {
                    console.log('google_places_atlas - Enqueuing callback, a lookup is already running for ' + city_name);
                }
            }
            return;
        }
        city_cache_entry = exports.city_cache[city_name] = {callbacks: [callback]};
        if (!GMPP_SERVICE) {
            GMPP_SERVICE = create_gmpp_service();
        }
        GMPP_SERVICE.textSearch({query: city_name, types: ['locality']}, function (city_results, status) {
            if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                console.log('google_places_atlas - Throttling Google Places query for 300ms');
                var callback_index = city_cache_entry.callbacks.indexOf(callback);
                city_cache_entry.callbacks.splice(callback_index, 1); // Removing callback
                setTimeout(function () {
                    exports.city_lookup(city_name, callback);
                }, 300);
            } else {
                var city_result;
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                    city_result = new Error('google_places_atlas - Lookup error [' + status + '] for city ' + city_name);
                    city_result.city_name = city_name;
                } else {
                    city_result = get_best_city_result(city_name, city_results);
                }
                city_cache_entry.city_result = city_result;
                var callbacks = city_cache_entry.callbacks;
                city_cache_entry.callbacks = null;
                callbacks.forEach(function (callback) {
                    callback.call(null, city_result);
                });
            }
        });
    },
};
