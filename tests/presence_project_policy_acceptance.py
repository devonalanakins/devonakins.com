#!/usr/bin/env python3
"""Owner-only project policy repair: Chromium/WebKit, mobile, no real credentials."""
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = subprocess.check_output(
    ["node", "--input-type=module", "-e",
     "import {renderPresenceOwner} from './src/presence-owner-page.mjs';"
     "process.stdout.write(renderPresenceOwner());"],
    cwd=ROOT, text=True,
)
CATALOG = {"devonakins-com": "DevonAkins.com", "merit": "Merit"}
with sync_playwright() as p:
    for engine in (p.chromium, p.webkit):
        browser = engine.launch()
        for width in (320, 390, 1440):
            context = browser.new_context(
                viewport={"width": width, "height": 844},
                reduced_motion="reduce",
            )
            page = context.new_page()
            state = {"revision": 7, "projects": [], "needsReview": True, "posts": []}

            def owner_status():
                return {
                    "revision": state["revision"],
                    "publishingAllowed": True, "enabled": True,
                    "shareListening": False, "privateWork": False,
                    "editorEnabled": False, "paused": False, "projectSlug": None,
                    "manualState": None, "manualExpiresAt": None,
                    "sessionExpiresAt": None, "sources": None,
                    "preview": {"state": "offline", "source": "none", "project": None},
                    "projects": state["projects"],
                    "projectChoicesNeedReview": state["needsReview"],
                    "projectCatalog": CATALOG,
                }

            def route(req):
                path = req.request.url.split("example.test", 1)[-1]
                if path.split("?", 1)[0] == "/owner/presence/":
                    return req.fulfill(body=HTML, content_type="text/html")
                if path.startswith("/v2/"):
                    # Cache-busting query parameters never belong in a local path.
                    asset_path = path.split("?", 1)[0]
                    file = ROOT / "public" / asset_path.lstrip("/")
                    return req.fulfill(
                        body=file.read_text(),
                        content_type="text/css" if file.suffix == ".css"
                        else "text/javascript")
                if path == "/api/presence/owner":
                    if req.request.method == "POST":
                        body = req.request.post_data_json
                        state["posts"].append(body)
                        if body.get("action") != "projects" or body.get("revision") != state["revision"]:
                            return req.fulfill(status=409, json={"error": "Revision changed"})
                        if any(v not in CATALOG for v in body.get("projects", [])):
                            return req.fulfill(status=400, json={"error": "Invalid project"})
                        state["revision"] += 1
                        state["projects"] = body["projects"]
                        state["needsReview"] = False
                    return req.fulfill(json=owner_status())
                if path == "/api/presence/owner?channel=tasks":
                    return req.fulfill(json={
                        "publishingAllowed": True, "sources": [],
                        "preview": {"version": 1, "visibility": "hidden", "tasks": []},
                    })
                if path == "/api/presence/owner?channel=cloud":
                    return req.fulfill(json={
                        "revision": 0, "publishingAllowed": False,
                        "enabled": False, "paired": False,
                        "privatePreview": {"state": "no-signal", "source": None,
                                           "project": None, "asOf": None,
                                           "expiresAt": None},
                    })
                if path == "/api/threads/auth/status":
                    return req.fulfill(json={
                        "version": 1, "appConfigured": False,
                        "storageReady": False, "connected": False,
                    })
                return req.abort()

            page.route("**/*", route)
            page.goto("https://example.test/owner/presence/")
            page.wait_for_function(
                "document.querySelector('#presence-notice').textContent.includes('Controls ready')")
            alert = page.locator("#project-policy-warning")
            assert alert.is_visible(), (engine.name, width, "missing warning")
            assert page.locator("input[data-public-project]").count() == len(CATALOG)
            assert not page.locator("input[data-public-project]:checked").count()
            page.wait_for_function(
                "document.querySelector('#task-notice').textContent.includes('Review and save')")
            assert page.locator("#task-connect").is_disabled(), (
                engine.name, width, "unapproved runner pairing visible")
            assert page.locator("#task-project option").count() == 0
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
                engine.name, width, "horizontal overflow")
            page.locator('input[data-public-project][value="devonakins-com"]').check()
            page.locator("#projects-save").click()
            page.wait_for_function(
                "document.querySelector('#project-policy-warning').hidden === true")
            assert state["posts"] == [{
                "action": "projects", "revision": 7, "projects": ["devonakins-com"]
            }], (engine.name, width, state["posts"])
            assert page.locator('input[data-public-project][value="devonakins-com"]').is_checked()
            assert not page.locator('input[data-public-project][value="merit"]').is_checked()
            assert page.locator("#project-policy-warning").is_hidden()
            page.wait_for_function(
                "document.querySelector('#task-connect').disabled === false")
            assert page.locator("#task-project option").count() == 1
            assert page.locator("#task-project").input_value() == "devonakins-com"
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
                engine.name, width, "post-save horizontal overflow")
            # OAuth return status must be discoverable at the top of the
            # private mobile dashboard, not buried below other controls.
            page.goto("https://example.test/owner/presence/?threads=exchange")
            banner = page.locator("#threads-oauth-return")
            banner.wait_for(state="visible")
            assert "first authorization-code exchange" in banner.inner_text(), (
                engine.name, width, "OAuth error missing from top banner")
            assert "first authorization-code exchange" in page.locator(
                "#threads-connection-status").inner_text()
            # Numeric Meta diagnostics are displayed without reflecting raw
            # untrusted provider message or arbitrary URL query values.
            page.goto("https://example.test/owner/presence/?threads=exchange&detail=http-400-meta-100-sub-1349245")
            page.locator("#threads-oauth-return").wait_for(state="visible")
            assert "HTTP 400, error code 100, subcode 1349245" in page.locator(
                "#threads-oauth-return").inner_text(), (engine.name,width)
            page.goto("https://example.test/owner/presence/?threads=exchange&detail=SECRET_KEY")
            page.locator("#threads-oauth-return").wait_for(state="visible")
            assert "SECRET_KEY" not in page.locator("#threads-oauth-return").inner_text()
            # Never claim an account is connected from a query parameter alone.
            page.goto("https://example.test/owner/presence/?threads=connected")
            page.locator("#threads-oauth-return").wait_for(state="visible")
            assert "did not verify a stored connection" in page.locator(
                "#threads-oauth-return").inner_text(), (engine.name, width)
            # A return intercepted by an Access sign-in can lose the callback
            # query; the session marker still gives the owner a safe clue.
            page.evaluate("sessionStorage.setItem('threadsPrivateOAuthStartedAt', String(Date.now()))")
            page.goto("https://example.test/owner/presence/")
            page.locator("#threads-oauth-return").wait_for(state="visible")
            assert "without a recognized authorization result" in page.locator(
                "#threads-oauth-return").inner_text(), (engine.name, width)
            assert not page.evaluate("sessionStorage.getItem('threadsPrivateOAuthStartedAt')")
            context.close()
        browser.close()
print("Owner project policy: warning, explicit approved save, privacy and responsive Chromium/WebKit at 320/390/1440 passed.")
