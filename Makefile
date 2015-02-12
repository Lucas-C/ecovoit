# BEWARE ! Makefiles require the use of hard tabs
export PATH := $(shell npm bin):$(PATH)
ZUUL_INSTALL_DIR:= $(shell npm root)/zuul

HTML_INDEX  := index.html
OUT_BUNDLE  := covoiturage-bundle.js
PROXY_WSGI  := proxy

SRC_DIR	    := src/
SRC_FILES   := $(wildcard $(SRC_DIR)*.js) $(wildcard $(SRC_DIR)*/*.js)

TESTS_BUNDLE:= covoiturage-tests-bundle.js
TESTS_DIR   := tests/
JS_TESTS    := $(wildcard $(TESTS_DIR)*.js)
PROXY_TESTS := $(wildcard $(TESTS_DIR)proxy_*.py)

TESTLING_VIEWER := testling-tests.html
TESTLING_EXTRA_BODY := $(TESTS_DIR)testling_body.html
TESTLING_PRELUDE:= browserified_testling_prelude.js

ZUUL_VIEWER     := zuul-tests.html
ZUUL_EXTRA_HEAD := $(TESTS_DIR)zuul_head.html
ZUUL_EXTRA_BODY := $(TESTS_DIR)zuul_body.html
ZUUL_TEST_DIR   := __zuul/

VNU_HTML_CHECKER:= vnu.jar

DOC_DIR     := doc/
DEPS_GRAPH  := $(DOC_DIR)dependencies_graph
DEPS_EXCLUDE:= "$$(ls src/crawlers|grep -Ev 'Carpooling|IdVroom'|sed 's/.js$$//'|tr '\n' '|')^\.|dom_shorthands|vanilla_utils"

.PHONY: view-local open-local-index deps-graph install pkg-upgrade-checker help
.PHONY: check check-static check-style check-html
.PHONY: test-proxy
.PHONY: testling-tests run-testling-tests open-testling-tests
.PHONY: zuul-tests run-zuul-tests open-zuul-tests
.PHONY: start-local-server restart-local-server kill-local-server list-local-server-processes

all: $(OUT_BUNDLE)
	@:

$(OUT_BUNDLE): $(SRC_FILES)
	# Assembling source files into a bundle
	browserify $(SRC_FILES) -o $(OUT_BUNDLE)

view-local: start-local-server open-local-index
	@:

open-local-index: $(HTML_INDEX) $(OUT_BUNDLE)
	## Opening the website in a browser
	python -m webbrowser http://localhost:8080/$(HTML_INDEX)

deps-graph: $(DEPS_GRAPH).png
	@:

$(DEPS_GRAPH).png: $(DEPS_GRAPH).json
	madge --read --image $(DEPS_GRAPH).png < $(DEPS_GRAPH).json

$(DEPS_GRAPH).json: $(SRC_FILES)
	madge --exclude $(DEPS_EXCLUDE) --json $(SRC_DIR) > $(DEPS_GRAPH).json

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

check-html: $(HTML_INDEX) $(VNU_HTML_CHECKER)
	## Running HTML conformity check
	grep -vF 'http-equiv="X-UA-Compatible"' $(HTML_INDEX) | java -jar $(VNU_HTML_CHECKER) -
	bootlint $(HTML_INDEX)

$(VNU_HTML_CHECKER):
	### Retrieving vnu.jar from github
	wget https://github.com/validator/validator/releases/download/20141006/vnu-20141013.jar.zip
	unzip vnu*.jar.zip
	mv vnu/$(VNU_HTML_CHECKER) .
	rm -r vnu/ vnu*.jar.zip

run-testling-tests: start-local-server open-testling-tests
	@:

open-testling-tests: testling-tests
	## Opening the tests HTML page in a browser
	python -m webbrowser http://localhost:8080/$(TESTLING_VIEWER)

testling-tests: $(TESTLING_VIEWER) $(TESTS_BUNDLE)
	@:

$(TESTLING_VIEWER): $(HTML_INDEX) $(TESTLING_EXTRA_BODY) $(TESTLING_PRELUDE)
	# Building the HTML file for rendering tests in a browser
	sed -e "/<script.*$(OUT_BUNDLE)/r $(TESTLING_EXTRA_BODY)" -e "/<script.*$(OUT_BUNDLE)/d" $(HTML_INDEX) > $(TESTLING_VIEWER)

$(TESTS_BUNDLE): $(JS_TESTS) $(SRC_FILES)
	## Generating JS tests bundle
	browserify $(JS_TESTS) > $(TESTS_BUNDLE)

$(TESTLING_PRELUDE):
	## Retrieving \& browserifying testling prelude
	wget https://raw.githubusercontent.com/substack/testling/master/browser/prelude.js
	browserify prelude.js > $(TESTLING_PRELUDE)
	rm prelude.js

run-zuul-tests: start-local-server open-zuul-tests
	@:

open-zuul-tests: zuul-tests
	## Opening the tests HTML page in a browser
	python -m webbrowser http://localhost:8080/$(ZUUL_VIEWER)

zuul-tests: $(ZUUL_VIEWER) $(TESTS_BUNDLE)
	@:

$(ZUUL_VIEWER): $(HTML_INDEX) $(ZUUL_EXTRA_HEAD) $(ZUUL_EXTRA_BODY) $(ZUUL_TEST_DIR)
	# Building the HTML file for rendering tests in a browser
	sed -e "/<\/style>/r $(ZUUL_EXTRA_HEAD)" -e "/<script.*$(OUT_BUNDLE)/r $(ZUUL_EXTRA_BODY)" -e "/<script.*$(OUT_BUNDLE)/d" $(HTML_INDEX) > $(ZUUL_VIEWER)

$(ZUUL_TEST_DIR): $(TESTS_BUNDLE)
	mkdir tmp_dir
	browserify $(ZUUL_INSTALL_DIR)/frameworks/tape/client.js > tmp_dir/client.js
	cp $(ZUUL_INSTALL_DIR)/frameworks/*.css tmp_dir/
	ln -s $(PWD)/$(TESTS_BUNDLE) tmp_dir/test-bundle.js
	mv tmp_dir $(ZUUL_TEST_DIR)

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

install:
	npm install
	pip install -r requirements.txt

pkg-upgrade-checker:
	david
	piprot requirements.txt

help:
	# make -n target           # --dry-run : get targets description
	# make -B target           # --always-make : force execution of targets commands, even if dependencies are satisfied
	# make OUT_BUNDLE=out.js   # variable override
	# make --debug[=abijmv]    # enable variants of make verbose output
