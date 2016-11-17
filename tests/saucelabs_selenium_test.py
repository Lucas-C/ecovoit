"""
USAGE: py.test -sv $this_file
"""
import io, json, logging, new, pytest, re, sys, unittest
from colorama import Back, Fore, Style
from sauceclient import SauceClient
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.firefox.firefox_profile import FirefoxProfile

class ColorLogsWrapper(object):
    COLOR_MAP = {
        'debug': Fore.CYAN,
        'info': Fore.GREEN,
        'warning': Fore.YELLOW,
        'error': Fore.RED,
        'critical': Back.RED,
    }

    def __init__(self, logger):
        self.logger = logger

    def __getattr__(self, attr_name):
        if attr_name == 'warn':
            attr_name = 'warning'
        if attr_name not in 'debug info warning error critical':
            return getattr(self.logger, attr_name)
        log_level = getattr(logging, attr_name.upper())
        # mimicking logging/__init__.py behaviour :
        if not self.logger.isEnabledFor(log_level):
            return

        def wrapped_attr(msg, *args, **kwargs):
            style_prefix = self.COLOR_MAP[attr_name]
            msg = style_prefix + msg + Style.RESET_ALL
            # We call _.log directly to not increase the callstack
            # so that Logger.findCaller extract the corrects filename/lineno
            return self.logger._log(log_level, msg, args, **kwargs)
        return wrapped_attr

LOG_FORMAT = "%(asctime)s - pid:%(process)s %(filename)s:%(lineno)d [%(levelname)s] %(message)s"
logging.basicConfig(stream=sys.stderr, format=LOG_FORMAT, level=logging.INFO)
LOGGER = ColorLogsWrapper(logging.getLogger(__name__))

SAUCE_URL = 'http://{username}:{accesskey}@ondemand.saucelabs.com:80/wd/hub'
LOG_TYPES = ('browser', 'client', 'driver', 'performance', 'server')

# Docs: https://docs.saucelabs.com/reference/test-configuration/
# Browsers stats: http://www.w3schools.com/browsers/browsers_stats.asp
# Not tested for now: Windows XP, Safari, iOS, Android
BROWSERS = [{"browserName": "chrome",
             "version": "26.0",
             "platform": "Windows 8.1",
             "screenResolution": "1280x1024"},
            {"browserName": "internet explorer",
             "version": "8.0",
             "platform": "Windows 7",
             "screenResolution": "1280x800"},
            {"browserName": "firefox",
             "version": "4.0",
             "platform": "Mac OS X 10.6",
             "screenResolution": "1920x1080"}]

def tokenize(string):
    return re.sub(r'[^\w]', '_', string)

def on_platforms(platforms):
    browser = pytest.config.getoption('--browser')
    website_url = pytest.config.getoption('--website-url')
    build_num = pytest.config.getoption('--build-num')
    is_local_testing = 'localhost' in website_url or '0.0.0.0' in website_url
    if not is_local_testing:
        LOGGER.info('Setting up Sauce client')
        with open('.saucelabs_auth.json', 'r') as open_file:
            saucelabs_auth = json.load(open_file)
        sauce = SauceClient(saucelabs_auth['username'], saucelabs_auth['accesskey'])
        if browser:
            platforms = [p for p in platforms if p["browserName"].replace(' ', '') == browser]

    def decorator(base_class):
        if is_local_testing:
            assert browser
            base_class.WEBDRIVER_PARAMS = {'desired_capabilities': getattr(DesiredCapabilities, browser.upper())}
            base_class.WEBSITE_URL = website_url
            base_class.build_num = build_num
            return base_class
        module = sys.modules[base_class.__module__].__dict__
        for platform in platforms:
            class_name = '%s_%s' % (base_class.__name__, tokenize(platform["browserName"]))
            platform["name"] = class_name
            platform["javascriptEnabled"] = True
            platform["acceptSslCerts"] = True
            platform["loggingPrefs"] = {log_type: 'ALL' for log_type in LOG_TYPES}
            class_attributes = dict(base_class.__dict__)
            class_attributes['WEBSITE_URL'] = website_url
            class_attributes['WEBDRIVER_PARAMS'] = {
                'desired_capabilities': platform,
                'command_executor': SAUCE_URL.format(**saucelabs_auth),
            }
            class_attributes['build_num'] = build_num
            class_attributes['sauce'] = sauce
            module[class_name] = new.classobj(class_name, (base_class,), class_attributes)
    return decorator

@on_platforms(BROWSERS)
class EcovoitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        LOGGER.info('Setting up Selenium driver')
        firefox_profile = FirefoxProfile()
        firefox_profile.set_preference('network.automatic-ntlm-auth.trusted-uris', 'chezsoi.org/ecovoit/index.html')
        firefox_profile.webdriver_assume_untrusted_issuer = False
        firefox_profile.webdriver_accept_untrusted_certs = True
        firefox_profile.update_preferences()
        # Quoting the docs: "Only used if Firefox is requested"
        cls.WEBDRIVER_PARAMS['browser_profile'] = firefox_profile
        cls.driver = webdriver.Remote(**cls.WEBDRIVER_PARAMS)

    @classmethod
    def tearDownClass(cls):
        try:
            if hasattr(cls, 'sauce'):
                job_id = cls.job_id()
                LOGGER.info('\nLink to your job: https://saucelabs.com/jobs/%s', job_id)
                suite_passed = cls.suite_passed()
                LOGGER.info('Tests passed: %s', suite_passed)
                cls.sauce.jobs.update_job(job_id,
                        passed=suite_passed, build_num=cls.build_num, public='public')
        finally:
            cls.dump_driver_logs()
            cls.driver.quit()

    @classmethod
    def dump_driver_logs(cls):
        full_log = {}
        for log_type in LOG_TYPES:
            try:
                full_log[log_type] = cls.driver.get_log(log_type)
            except WebDriverException as error:
                LOGGER.info('%s' % error)
                full_log[log_type] = None
        filename = '%s_driver.json' % cls.__name__
        with open(filename, 'w') as open_file:
            json.dump(full_log, open_file, sort_keys=True, indent=2)

    @classmethod
    def job_id(cls):
        jobs = cls.sauce.jobs.get_jobs()
        return [j for j in jobs if j['name'] == cls.__name__][0]['id']

    @classmethod
    def suite_passed(cls):
        # pytest passes a custom TestCaseFunction as 'result' arg to .run() instead of a unittest.TestResult
        # pylint: disable=protected-access
        if hasattr(cls.final_result, 'wasSuccessful'):
            return cls.final_result.wasSuccessful()
        else:
            return bool(cls.final_result._excinfo)

    def run(self, result=None):
        """TestResult instance interception"""
        self.__class__.final_result = result
        unittest.TestCase.run(self, result)

    @classmethod
    def wait_until_document_ready(cls, timeout_delay):
        WebDriverWait(cls.driver, timeout_delay).until(
            lambda driver: driver.execute_script("return document.readyState;") == 'complete')

    @classmethod
    def get_rendered_html(cls):
        return cls.driver.execute_script("return document.getElementsByTagName('html')[0].innerHTML")

    @classmethod
    def get_testling_output(cls):
        return cls.driver.find_element_by_id('__testling_output').text

    def test_live_website(self):
        self.driver.get('%s/index.html' % self.WEBSITE_URL)
        self.wait_until_document_ready(timeout_delay=3)
        date_selected = self.driver.find_element_by_id('date-selected')
        assert date_selected.get_attribute('value')

    def test_testling(self):
        self.driver.get('%s/testling-tests.html' % self.WEBSITE_URL)
        WebDriverWait(self.driver, timeout=100).until(
            lambda driver: self.watch_and_dump_testlings_tests())
        testling_output = self.get_testling_output()
        assert get_testling_failure_count(testling_output) == 0

    @classmethod
    def watch_and_dump_testlings_tests(cls):
        testling_output = cls.get_testling_output()
        dump_filelog('testling-tests.log', cls.__name__, testling_output)
        try:
            get_testling_failure_count(testling_output)
            return True
        except TestingInProgress:
            return False

class TestingInProgress(Exception): pass

def get_testling_failure_count(testling_output):
    """Either returns an integer or raise TestingInProgress"""
    testslog_lines = testling_output.split('\n')
    if len(testslog_lines) < 3:
        raise TestingInProgress
    if all(testslog_lines[line_index].startswith(prefix)
           for line_index, prefix in ((-3, '# tests'), (-2, '# pass'), (-1, '# fail'))):
        return int(testslog_lines[-1].split(' ')[-1])
    if all(testslog_lines[line_index].startswith(prefix)
           for line_index, prefix in ((-4, '# tests'), (-3, '# pass'), (-1, '# ok'))):
        return 0
    raise TestingInProgress

def dump_filelog(filename_suffix, platform_name, text):
    filename = '%s_%s' % (platform_name, filename_suffix)
    with io.open(filename, 'w', encoding='utf-8') as open_file:
        open_file.write(text)
