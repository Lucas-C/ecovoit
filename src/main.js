'use strict';

var dom = require('./utils/dom_shorthands.js'),
    bs_alerts = require('./utils/bootstrap_alerts.js'),
    errors_utils = require('./utils/errors_utils.js'),
    tracker = require('./utils/usage_tracker.js'),
    form_header = require('./form_header.js'),
    results_viewer = require('./results_viewer.js'),
    WELCOME_MESSAGE = dom.byId('welcome-message').textContent.trim(),
    main = function () {
        tracker.record_page_view();

        results_viewer.init();
        form_header.init(results_viewer);

        bs_alerts.display("CE SITE N'EST ACTUELLEMENT PLUS FONCTIONNEL.<br>Il s'agissait d'un projet expérimental personnel. Contactez-moi si jamais vous trouvez le projet intéressant et souhaitez pouvoir utiliser un tel moteur.", 'alert-danger');

        bs_alerts.display(WELCOME_MESSAGE, 'alert-info');

        if (/autofill=true/.test(location.search)) {
            dom.byId('from-place').value = 'Angers, France';
            dom.byId('to-place').value = 'Nantes, France';
            dom.select('.navbar-form button').click();
        }
    };

try {
    main();
} catch (error) {
    errors_utils.display_error(error);
}
