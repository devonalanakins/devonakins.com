"""Poll through the browser debugging API without page-side eval under strict CSP."""
import time
import urllib.request
from urllib.parse import urlparse

def wait_for_local_preview(origin, server=None, context=None):
    """Poll owned loopback servers; public readiness is checked by real navigation.

    The public edge legitimately rejects Python's non-browser client (1010).
    Requiring that client would prevent the browser acceptance from even starting.
    Actual public navigations retain normal TLS and edge security checks.
    """
    if urlparse(origin).hostname not in ('127.0.0.1', 'localhost', '::1'):
        return
    for _ in range(100):
        try:
            urllib.request.urlopen(origin, timeout=1, context=context).close()
            return
        except Exception:
            if server and server.poll() is not None:
                raise AssertionError('Preview exited')
            time.sleep(.2)
    raise AssertionError('Local preview unavailable')

def wait_for_condition(page, expression, timeout_ms=15000):
    deadline=time.monotonic()+timeout_ms/1000
    while time.monotonic()<deadline:
        if page.evaluate('() => ('+expression+')'):
            return
        page.wait_for_timeout(50)
    raise AssertionError('Timed out waiting for browser condition: '+expression)
