'use strict';

var diacritics = require('./diacritics.js'),
    bs_alerts = require('./bootstrap_alerts.js'),
    get_indices_of_uniq_values = function (array) {
        return _.uniq(_.range(array.length), function (i) {
            return array[i];
        });
    };

exports = module.exports = {
    // The last 3 parameters must be arrays indexed the same way. The last argument can also be null
    get_best_city_info_candidates: function (query_city_name, city_info_candidates, city_name_candidates, department_code_candidates) {
        if (city_info_candidates.length <= 1) {
            return city_info_candidates;
        }
        var matching_city_indices = exports.get_name_matching_city_indices(query_city_name, city_name_candidates);
        if (matching_city_indices.length >= 1) {
            city_info_candidates = _.at(city_info_candidates, matching_city_indices);
            if (department_code_candidates) {
                department_code_candidates = _.at(department_code_candidates, matching_city_indices);
            }
        }
        if (city_info_candidates.length > 1 && department_code_candidates) {
            matching_city_indices = get_indices_of_uniq_values(department_code_candidates);
            if (matching_city_indices.length >= 1) {
                city_info_candidates = _.at(city_info_candidates, matching_city_indices);
            }
        }
        return city_info_candidates;
    },
    get_name_matching_city_indices: function (query_city_name, candidate_city_names) {
        // This is tricky:
        // - we want "Saint-Barthélemy-d'Anjou" == 'Saint-Barthélémy d\'Anjou'
        // - but Abbécourt != Abbecourt
        if (candidate_city_names.length === 1) {
            return [0];
        }
        var indices = _.range(candidate_city_names.length);
        // We first try an exact match, including diacritics (accents, etc.)
        var lowercase_query_city_name = query_city_name.toLowerCase().replace(/-/g, ' '),
            matching_citynames_indices = _.filter(indices, function (i) {
                var lowercase_candidate_city_name = candidate_city_names[i].toLowerCase().replace(/-/g, ' ');
                return lowercase_query_city_name === lowercase_candidate_city_name;
            });
        if (matching_citynames_indices.length === 0) {
            // If no city matches exactly, we filter again but this time ignorin any diacritics
            var diacriticless_query_city_name = diacritics.remove_from(lowercase_query_city_name);
            matching_citynames_indices = _.filter(indices, function (i) {
                var diacriticless_candidate_city_name = diacritics.remove_from(candidate_city_names[i].toLowerCase().replace(/-/g, ' '));
                return diacriticless_query_city_name === diacriticless_candidate_city_name;
            });
        }
        return matching_citynames_indices;
    },
    display_homonyms_warning: function (module_name, query_city_name, homonymous_city_names) {
        bs_alerts.display(module_name + ' - Il existe plusieurs villes nommées "' + query_city_name + '": '
            + homonymous_city_names.join(', ') + '<br>'
            + 'La recherche sera effectuée pour "' + homonymous_city_names[0] + '".', 'alert-warning');
    },
};
