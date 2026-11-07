#!/usr/bin/env python3
"""Capture and check built V5 homepage candidate, not synthetic preview HTML.

Run only after V5_PUBLIC_HOME_CANDIDATE=1 npm run build. Never deploys.
The public V4 activity API is mocked locally and all other API/external
traffic is blocked. This is not production account verification.
"""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import socket
import subprocess
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "v5-review-screenshots"


def stamp(t):
    return t.isoformat(timespec="milliseconds").replace("+00:00", "Z")


@contextmanager
def built_site():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    child = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "preview", "--host",
         "127.0.0.1", "--port", str(port), "--strictPort"],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    origin = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            if child.poll() is not None:
                raise AssertionError("candidate server failed: " + child.stderr.read().decode())
            try:
                urllib.request.urlopen(origin + "/", timeout=1).close()
                break
            except OSError:
                time.sleep(.1)
        else:
            raise AssertionError("Candidate server did not become ready")
        yield origin
    finally:
        child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
        child.stderr.close()


def main():
    OUT.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc)
    public = {
        "version": 4, "asOf": stamp(now),
        "work": {
            "version": 1, "visibility": "public", "source": "editor-heartbeat",
            "project": "Mizvo", "state": "developing",
            "asOf": stamp(now - timedelta(seconds=6)),
        },
        "remote": {"visibility": "hidden", "tasks": []},
        "recent": [],
    }
    report = []
    with built_site() as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            for width, height in [(1199, 1312), (390, 844)]:
                context = browser.new_context(viewport={"width": width, "height": height},
                                              reduced_motion="reduce")
                page = context.new_page()
                errors, blocked, api_calls = [], [], []
                page.on("pageerror", lambda error: errors.append(str(error)))

                def route(route):
                    url = route.request.url
                    if url == origin + "/api/activity/v4":
                        api_calls.append(url)
                        route.fulfill(status=200, content_type="application/json",
                                      body=json.dumps(public))
                    elif "/api/" in url or not url.startswith(origin + "/"):
                        blocked.append(url)
                        route.abort()
                    else:
                        route.continue_()

                page.route("**/*", route)
                try:
                    assert page.goto(origin + "/", wait_until="networkidle").status == 200
                    assert page.locator("html").get_attribute("data-v5-signal-mode") == "released-v5"
                    assert page.locator(".v5-preview-banner").count() == 0
                    assert page.locator("[data-v5-preview-connect]").count() == 0
                    assert page.locator(".v5-lock-project").count() == 5
                    assert page.locator(".v5-lock-beam").count() == 8
                    page.wait_for_function(
                        "() => document.querySelector('[data-v5-work-summary]')"
                        "?.textContent === 'Mizvo'",
                        timeout=10000,
                    )
                    assert len(api_calls) == 1, "Candidate must start a single V4 read"
                    assert page.locator('a[data-v5-field-slug="mizvo"]').get_attribute(
                        "data-v5-verified"
                    ) == "editor"
                    assert page.locator(".v5-lock-spotify").inner_text().find(
                        "Playback not loaded"
                    ) >= 0, "Do not invent Spotify playback"
                    assert page.evaluate(
                        "document.documentElement.scrollWidth <= innerWidth + 1"
                    ), f"Horizontal overflow at {width}"
                    page.evaluate("window.scrollTo(0, 0)")
                    page.screenshot(
                        path=str(OUT / f"RELEASE-CANDIDATE-home-{width}x{height}.png"),
                        full_page=True, animations="disabled",
                    )
                    assert not errors, errors
                    assert not blocked, blocked
                    report.append({"viewport": [width, height], "public_api_reads":len(api_calls),
                                   "source":"synthetic allowlisted V4 fixture",
                                   "hero_mode":"released-v5", "overflow": False})
                finally:
                    context.close()
        finally:
            browser.close()
    (OUT / "release-candidate-manifest.json").write_text(json.dumps(report, indent=2))
    print("V5 built public homepage candidate passed Chromium desktop/mobile, one source reader,"
          " no preview controls, no overflow or external requests; synthetic data only.")


if __name__ == "__main__":
    main()
