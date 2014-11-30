'use strict';

module.exports = {
    byId: document.getElementById.bind(document),
    create: document.createElement.bind(document),
    create_from_string: function (string) {
        var div = document.createElement('div');
        div.innerHTML = string;
        return div.children[0];
    },
    select: document.querySelector.bind(document),
    selectAll: document.querySelectorAll.bind(document),
    remove: function (element) {
        element.parentNode.removeChild(element);
    },
    remove_all_children: function (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },
    class_list_remove: function (element, class_name) {
        element.className = element.className
            .replace(new RegExp('(?:^|\\s)' + class_name + '(?!\\S)', 'g'), '');
    },
    class_list_replace: function (element, target_class_name, new_class_name) {
        element.className = element.className
            .replace(new RegExp('(?:^|\\s)' + target_class_name + '(?!\\S)', 'g'), new_class_name);
    },
    class_list_has: function (element, class_name) {
        return element.className.match(new RegExp('(?:^|\\s)' + class_name + '(?!\\S)'));
    },
};
