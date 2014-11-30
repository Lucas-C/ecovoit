# BEWARE ! Makefiles require the use of hard tabs
export PATH := $(shell npm bin):$(PATH)

HTML_INDEX  := index.html
OUT_BUNDLE  := covoiturage-bundle.js
PROXY_WSGI  := proxy

SRC_DIR	    := src/
SRC_FILES   := $(wildcard $(SRC_DIR)*.js) $(wildcard $(SRC_DIR)*/*.js)

HTML_TESTS_VIEWER  := index-tests.html
TESTS_BUNDLE:= covoiturage-tests-bundle.js
TESTS_DIR   := tests/
JS_TESTS    := $(wildcard $(TESTS_DIR)*.js)
PROXY_TESTS := $(wildcard $(TESTS_DIR)proxy_*.py)

PRELUDE     := browserified_testling_prelude.js
HTML_CHECKER:= vnu.jar

DOC_DIR     := doc/
DEPS_GRAPH  := $(DOC_DIR)dependencies_graph
DEPS_EXCLUDE:= "$$(ls src/crawlers|grep -Ev 'Carpooling|IdVroom'|sed 's/.js$$//'|tr '\n' '|')^\.|dom_shorthands|vanilla_utils"

.PHONY: check check-static check-style check-html
.PHONY: test-proxy js-tests view-js-tests view-local open-js-tests open-local-index 
.PHONY: start-local-server restart-local-server kill-local-server list-local-server-processes
.PHONY: deps-graph install install-prelude-dependencies help

all: $(OUT_BUNDLE)
	@:

$(OUT_BUNDLE): $(SRC_FILES)
	# Assembling source files into a bundle
	browserify $(SRC_FILES) -o $(OUT_BUNDLE)

check: check-static check-style check-html
	@:

test-proxy: $(PROXY_TESTS) $(PROXY_WSGI).py
	## Unit + httbin.org-based proxy testing
	py.test -v -r w $(PROXY_TESTS)

check-static: $(SRC_FILES) $(PROXY_WSGI).py
	## Running static analysis check on JS & Python code
	jshint $(SRC_FILES)
	pylint -f colorized $(PROXY_WSGI).py

check-style: $(SRC_FILES)
	## Running code style check on JS & python files
	jscs $(SRC_FILES)
	pep8 $(PROXY_WSGI).py

check-html: $(HTML_INDEX)
	## Running HTML conformity check
	grep -vF 'http-equiv="X-UA-Compatible"' $(HTML_INDEX) | java -jar $(HTML_CHECKER) -
	bootlint $(HTML_INDEX)

deps-graph: $(DEPS_GRAPH).png
	@:

$(DEPS_GRAPH).png: $(DEPS_GRAPH).json
	madge --read --image $(DEPS_GRAPH).png < $(DEPS_GRAPH).json

$(DEPS_GRAPH).json: $(SRC_FILES)
	madge --exclude $(DEPS_EXCLUDE) --json $(SRC_DIR) > $(DEPS_GRAPH).json

js-tests: $(HTML_TESTS_VIEWER) $(TESTS_BUNDLE)
	@:

$(HTML_TESTS_VIEWER): $(HTML_INDEX) $(PRELUDE)
	# Building the HTML file for rendering tests in a browser
	perl -wp -e 'BEGIN { $$l1 = "    <script type='text/javascript' src='$(PRELUDE)' defer></script>\n"; }' \
		   	 -e 'BEGIN { $$l2 = "    <pre id='__testling_output'></pre>\n"; }' \
		 	 -e 's/$(OUT_BUNDLE)/$(TESTS_BUNDLE)/ && ($$_ .= $$l1.$$l2)' $(HTML_INDEX) > $(HTML_TESTS_VIEWER)

$(TESTS_BUNDLE): $(JS_TESTS) $(SRC_FILES)
	## Generating JS tests bundle
	browserify $(JS_TESTS) > $(TESTS_BUNDLE)

$(PRELUDE): install-prelude-dependencies
	## Retrieving \& browserifying testling prelude
	wget https://raw.githubusercontent.com/substack/testling/master/browser/prelude.js
	browserify prelude.js > $(PRELUDE)
	rm prelude.js

view-js-tests: start-local-server open-js-tests
	@:

view-local: start-local-server open-local-index
	@:

open-js-tests: js-tests
	## Opening the tests HTML page in a browser
	python -m webbrowser http://localhost:8080/$(HTML_TESTS_VIEWER)

open-local-index: $(HTML_INDEX) $(OUT_BUNDLE)
	## Opening the website in a browser
	python -m webbrowser http://localhost:8080/$(HTML_INDEX)

start-local-server:
	## Launching a local server to serve HTML files & WSGI apps
	uwsgi --http :8080 --static-map /=. --touch-reload $(HTML_INDEX) \
                --manage-script-name --mount /$(PROXY_WSGI)=$(PROXY_WSGI).py --py-autoreload 2 --daemonize uwsgi.log &

restart-local-server:
	@pgrep -f '^[^ ]*uwsgi' | ifne xargs kill

list-local-server-processes:
	@pgrep -f '^[^ ]*uwsgi' | ifne xargs ps -fp

kill-local-server:
	@pgrep -f '^[^ ]*uwsgi' | ifne xargs kill -2

$(HTML_CHECKER):
	### Retrieving vnu.jar from github
	wget https://github.com/validator/validator/releases/download/20141006/vnu-20141013.jar.zip
	unzip vnu*.jar.zip
	mv vnu/$(HTML_CHECKER) .
	rm -r vnu/ vnu*.jar.zip

install:
	npm install
	pip install -r requirements.txt

install-prelude-dependencies:
	npm install xhr-write-stream jsonify object-inspect

help:
	# make -n target           # --dry-run : get targets description
	# make -B target           # --always-make : force execution of targets commands, even if dependencies are satisfied
	# make OUT_BUNDLE=out.js   # variable override
	# make --debug[=abijmv]    # enable variants of make verbose output

