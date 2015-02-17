from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
AVAILABLE_BROWSERS = [b.lower() for b in DesiredCapabilities.__dict__.keys() if not b.startswith('_')]
DEFAULT_WEBSITE = 'https://chezsoi.org/ecovoit'

def pytest_addoption(parser):
    parser.addoption('--website-url', default=DEFAULT_WEBSITE,
                     help='SauceLabs is only used if the website DO NOT contain "localhost" or 0.0.0.0'
                          ' - Default: ' + DEFAULT_WEBSITE)
    parser.addoption('--browser', choices=AVAILABLE_BROWSERS,
                     help='Required if testing locally')
