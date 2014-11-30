import pytest
from webtest import AppError
from webtest import TestApp as WebTestApp  # because of its native name pytest would try to collect it
from proxy import application

def test_error_method_not_allowed():
    app = WebTestApp(application)
    with pytest.raises(AppError) as app_error:
        app.put('')
    assert '405 Method Not Allowed : Unsupported request method' in str(app_error.value)

def test_error_no_website():
    app = WebTestApp(application)
    with pytest.raises(AppError) as app_error:
        app.get('')
    assert '400 Bad Request : No website specified' in str(app_error.value)

def test_error_website_not_allowed():
    app = WebTestApp(application)
    with pytest.raises(AppError) as app_error:
        app.get('/foo')
    assert '403 Forbidden : Website not allowed' in str(app_error.value)

