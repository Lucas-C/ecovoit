from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
AVAILABLE_BROWSERS = [b.lower() for b in DesiredCapabilities.__dict__.keys() if not b.startswith('_')]

def pytest_addoption(parser):
    parser.addoption('--website-url', default='https://chezsoi.org/ecovoit',
                     help='SauceLabs is only used if the website DO NOT contain "localhost" or 0.0.0.0')
    parser.addoption('--browser', default='firefox', choices=AVAILABLE_BROWSERS)
