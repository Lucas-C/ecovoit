import logging, new, os, sys, unittest
from colorama import Back, Fore, Style
from sauceclient import SauceClient
from selenium import webdriver

SAUCE_URL = 'http://%s:%s@ondemand.saucelabs.com:80/wd/hub'

BROWSERS = [{"platform": "Mac OS X 10.9",
             "browserName": "chrome",
             "version": "31"},
            {"platform": "Windows 8.1",
             "browserName": "internet explorer",
             "version": "11"}]

USERNAME = os.environ['SAUCE_USERNAME']
ACCESS_KEY = os.environ['SAUCE_ACCESS_KEY']


class ColoredLogger(object):
    COLOR_MAP = {
        'debug': Fore.CYAN,
        'info': Fore.GREEN,
        'warn': Fore.YELLOW,
        'warning': Fore.YELLOW,
        'error': Fore.RED,
        'critical': Back.RED,
    }
    def __init__(self, logger):
        self.logger = logger
    def __getattr__(self, attr_name):
        attr = getattr(self.logger, attr_name)
        if attr_name not in ('debug', 'info', 'warn', 'warning', 'error', 'critical'):
            return attr
        return lambda msg, *args, **kwargs: attr(self.COLOR_MAP[attr_name] + msg + Style.RESET_ALL, *args, **kwargs)

def on_platforms(platforms):
    def decorator(base_class):
        module = sys.modules[base_class.__module__].__dict__
        for i, platform in enumerate(platforms):
            class_attributes = dict(base_class.__dict__)
            class_attributes['PLATFORM'] = platform
            name = "%s_%s" % (base_class.__name__, i + 1)
            module[name] = new.classobj(name, (base_class,), class_attributes)
    return decorator

@on_platforms(BROWSERS)
class SauceSampleTest(unittest.TestCase):
    def setUp(self):
        logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
        self.logger = ColoredLogger(logging.getLogger())
        self.logger.setLevel(logging.DEBUG)
        self.logger.info('Setting up Selenium driver')
        # pylint: disable=no-member
        self.PLATFORM['name'] = self.id()
        self.driver = webdriver.Remote(
            desired_capabilities=self.PLATFORM,
            command_executor=SAUCE_URL % (USERNAME, ACCESS_KEY)
        )
        self.driver.implicitly_wait(30)
        self.logger.info('Setting up Sauce client')
        self.sauce = SauceClient(USERNAME, ACCESS_KEY)

    def tearDown(self):
        self.logger.info('Link to your job: https://saucelabs.com/jobs/%s', self.driver.session_id)
        try:
            passed = (sys.exc_info() == (None, None, None))
            self.logger.info('Tests passed: %s', passed)
            self.sauce.jobs.update_job(self.driver.session_id, passed=passed)
        finally:
            self.driver.quit()

    def test_sauce(self):
        self.driver.get('https://chezsoi.org/ecovoit')
        assert 'Bienvenue' in self.driver.find_element_by_class_name('alert').text
