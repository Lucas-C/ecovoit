Bug reports and pull requests are welcome !

## For developpers

### Code style recommendations

- write code & comments in English please
- not all the functions exposed by a module are needed outside of it, but that makes them simpler to test
- try to keep the use of jQuery to a minimum
- prefer a functional approach over OOP, and use duck-typing over `instanceof` checks
- avoid using `this` : EcmaScript `this` is not at all like Java `this`. It's a [_Variable Object_](http://perfectionkills.com/understanding-delete/#activation_object_variable_object). Any function can be executed with any `this`. Hence it is most often better to rely on a module explicit `exports` variable. Only use `this` when polymorphism is required, e.g. _base\_crawler.js_ `assert`.
- avoid using [`delete`](http://www.smashingmagazine.com/2012/11/05/writing-fast-memory-efficient-javascript/)
- avoid using `bind`, as it's impossible to retrieve parameters bound to a function. Prefer lodash `_.partial`.
- avoid module circular dependencies, as they will probably break a `require` call a some point. You can easily detect them as they would appear in red in the dependencies graph.
- use the `lowercase\_separated\_by\_underscores` naming convention for variables & function names, and `UPPERCASE\_SEPARATED\_BY\_UNDERSCORES` for constants. CamelCase naming convention is great, but usually used for class names, and we don't use any in this project.
- be aware of UTC dates 'gotchas' :

    Date.create(date\_string).getTime() !== Date.utc.create(date\_string).getTime()
    Date.create().beginningOfDay().getTime() !== Date.utc.create().beginningOfDay().getTime()

### Adding a new crawler

I recommend to use the 'Network' tab of Firefox "Developper Tools" pannel to study a website traffic : query parameters, cookies, HTTP headers, authentication... Alternatively, using [`mitmproxy`](http://mitmproxy.org) as a gateway to inspect HTTP exchanges can be very useful.

In terms of HTML parsing, once you've made a successful query to a website in Javascript, a simple way to look at the "raw" HTML response is to add a `inspector=TAG_NAME` parameter to the url: this will replace a crawler rides array by the carpooling website results HTML.

### Debugging

Add `debug=true&autofill=true` to *ecovoit* website URL to enable more debug messages and activate departure / arrival cities autofill.
