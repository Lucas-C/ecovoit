import cgi, logging, logging.handlers, os, requests, urlparse, socket, traceback
from Cookie import SimpleCookie
from threading import Lock

USER_AGENT_STRING = 'EcovoitBot/1.0 (+https://chezsoi.org/ecovoit)'
LOG_FILE = os.path.join(os.path.dirname(__file__), 'proxy.log')
LOG_FORMAT = '%(asctime)s - %(process)s [%(levelname)s] %(filename)s %(lineno)d %(message)s'
HTML_TEMPLATE = """'<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>{title}</title>
  </head>
  <body>
{body}
  </body>
</html>"""
ALLOWED_WEBSITES = {
    'httpbin.org': 'http',
    'www.covoiturage.fr': 'http',
    'www.covoiturage-libre.fr': 'http',
    'www.leboncoin.fr': 'http',
    'www.carpooling.fr': 'http',
    'www.vadrouille-covoiturage.com': 'http',
    'www.idvroom.com': 'https',
}

def configure_logger():
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    file_handler = logging.handlers.RotatingFileHandler(LOG_FILE, maxBytes=1024 ** 2, backupCount=10)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(file_handler)
    return logger

_LOGGER = configure_logger()
_LOGGER_LOCK = Lock()

def log(msg, lvl=logging.INFO):
    with _LOGGER_LOCK:
        _LOGGER.log(lvl, msg)

class HTTPError(Exception):
    def __init__(self, message, code):
        super(HTTPError, self).__init__(message)
        self.code = code
        self.status_string = error_code_to_status_string(code)
        self.status_line = str(code) + ' ' + self.status_string
        self.full_msg = '[ERROR] {e.status_line} : {e.message}'.format(e=self)

def application(env, start_response):
    path = env.get('PATH_INFO', '')
    method = env['REQUEST_METHOD']
    query_string = env['QUERY_STRING']
    form = pop_form(env)
    content_type = env.get('CONTENT_TYPE')
    cookies = env.get('HTTP_COOKIE')
    log('Proxying request: {} "{}" with content-type: {}, query_string: "{}", form: {} and cookies: "{}"'.format(
        method, path, content_type, query_string, form, cookies))
    try:
        # pylint: disable=broad-except
        try:
            status, headers, content = proxy_request(method, path, content_type, query_string, form, cookies)
            start_response(status, headers)
            return [content]
        except HTTPError:
            raise
        except Exception:
            raise HTTPError(traceback.format_exc(), code=500)
    except HTTPError as error:
        log(error.full_msg)
        html_body = '    <pre>\n' + cgi.escape(error.full_msg) + '\n    </pre>'
        start_response(error.status_line, [('Content-Type', 'text/html')])
        return [HTML_TEMPLATE.format(title=error.status_line, body=html_body)]

def pop_form(env):
    """Should be called only ONCE."""
    post_env = env.copy()
    post_env['QUERY_STRING'] = ''
    form = cgi.FieldStorage(
        fp=env['wsgi.input'],
        environ=post_env,
        keep_blank_values=True
    )
    return form

def proxy_request(method, path, content_type, query_string, form, cookies):  # pylint: disable=too-many-arguments
    if method.upper() not in ('GET', 'POST'):
        raise HTTPError('Unsupported request method: {}'.format(method), code=405)
    url = get_url(path)
    request_kwargs = get_request_kwargs(method, content_type, query_string, form, cookies)
    try:
        response = requests.request(method, url, **request_kwargs)
    except (requests.exceptions.Timeout, socket.timeout) as error:
        raise HTTPError(error.message, code=504)
    if 'content-encoding' in response.headers and 'gzip' in response.headers['content-encoding']:
        log('-> removing content headers: {}'.format(response.headers['content-encoding']))
        del response.headers['content-encoding']
        response.headers['content-length'] = str(len(response.content))
    if 'transfer-encoding' in response.headers and 'chunked' in response.headers['transfer-encoding']:
        log('-> removing transfer-encoding header: {}'.format(response.headers['transfer-encoding']))
        del response.headers['transfer-encoding']
    text_status = '{} {}'.format(response.status_code, response.reason)
    log('Reponse status: {} - Encoding guessed: {} - Headers: {}'.format(
        text_status, response.encoding, response.headers))
    return text_status, list(response.headers.iteritems()), response.content

def get_url(path):
    if not path.startswith('/'):
        raise HTTPError('No website specified: "{}"'.format(path), code=400)
    website = path.split('/')[1]
    if website not in ALLOWED_WEBSITES:
        raise HTTPError('Website not allowed: "{}"'.format(website), code=403)
    log('-> allowed for website "{}"'.format(website))
    return ALLOWED_WEBSITES[website] + ':/' + path

def get_request_kwargs(method, content_type, query_string, form, cookies):
    kwargs = {
        'params': {},
        'data': None,
        'files': None,
        'cookies': None,
        'headers': {
            'User-Agent': USER_AGENT_STRING,
        },
        'timeout': 10,  # totally empirical value
        'verify': False,
    }
    if query_string:
        kwargs['params'] = dict(urlparse.parse_qsl(query_string, True))
    if method.upper() == 'POST' and form:
        if content_type.startswith('multipart/form-data'):
            kwargs['files'] = {k: ('', form[k].value) for k in form}
        else:
            kwargs['data'] = {k: form[k].value for k in form}
    if cookies:
        cookies = SimpleCookie(cookies)
        kwargs['cookies'] = {k: cookies[k].value for k in cookies}
    log('-> making request with params "{params}", data "{data}", files "{files}" and cookies "{cookies}"'.format(
        **kwargs))
    return kwargs

def error_code_to_status_string(error_code):
    # pylint: disable=protected-access
    status_strings = requests.status_codes._codes[error_code]
    return ' '.join(w.capitalize() for w in status_strings[0].split('_'))
