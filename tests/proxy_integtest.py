import pytest
from webtest import AppError
from webtest import TestApp as WebTestApp  # because of its native name pytest would try to collect it
from proxy import application

def test_simple_get():
    app = WebTestApp(application)
    response = app.get('/httpbin.org/get')
    assert 'EcovoitBot' in response.json['headers']['User-Agent']

def test_get_with_params():
    app = WebTestApp(application)
    params = {'show_env': '1', 'foo': 'bar'}
    response = app.get('/httpbin.org/get', params)
    assert response.json['args'] == params

def test_cookies():
    app = WebTestApp(application)
    app.set_cookie('PHPSESSID', '7eciggd0abcsrv40q105v3r976')
    response = app.get('/httpbin.org/cookies')
    assert response.json['cookies']['PHPSESSID'] == '7eciggd0abcsrv40q105v3r976'

def test_post():
    app = WebTestApp(application)
    params = {'show_env': '1', 'foo': 'bar'}
    response = app.post('/httpbin.org/post?dum=my', params, content_type='multipart/form-data')
    assert response.json['form'] == params
    assert response.json['args']['dum'] == 'my'

def test_error_status_503():
    app = WebTestApp(application)
    with pytest.raises(AppError) as app_error:
        app.get('/httpbin.org/status/503')
    assert 'Bad response: 503 SERVICE UNAVAILABLE' in str(app_error.value)
