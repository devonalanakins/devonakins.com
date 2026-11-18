"""Poll through the browser debugging API without page-side eval under strict CSP."""
import time

def wait_for_condition(page, expression, timeout_ms=15000):
    deadline=time.monotonic()+timeout_ms/1000
    while time.monotonic()<deadline:
        if page.evaluate('() => ('+expression+')'):
            return
        page.wait_for_timeout(50)
    raise AssertionError('Timed out waiting for browser condition: '+expression)
