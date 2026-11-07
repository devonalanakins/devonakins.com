#!/usr/bin/env python3
"""Focused, synthetic V5 consent/revocation browser gate.

Uses the real Vite preview and Chromium. Public V4 responses are intercepted
locally; no account secrets or provider requests are used. This does not
constitute a production source-connection acceptance test.
"""
from datetime import datetime, timedelta, timezone
import json

from playwright.sync_api import sync_playwright
from v5_browser_acceptance import PREVIEW, server


def stamp(dt):
    return dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def run():
    now = datetime.now(timezone.utc)
    state = {"mode": "active"}
    calls = []
    blocked = []
    active = {
        "version": 4,
        "asOf": stamp(now),
        "work": {
            "version": 1, "visibility": "public", "source": "editor-heartbeat",
            "project": "Mizvo", "state": "developing",
            "asOf": stamp(now - timedelta(seconds=12)),
        },
        "remote": {
            "version": 1, "visibility": "public", "tasks": [{
                "source": "codex", "project": "Merit", "state": "running",
                "checkpoint": None,
                "asOf": stamp(now - timedelta(seconds=15)),
                "expiresAt": stamp(now + timedelta(seconds=85)),
            }],
        },
        "recent": [{
            "project": "Mizvo", "projectSlug": "mizvo", "kind": "Commit",
            "at": stamp(now - timedelta(seconds=30)),
            "url": "https://github.com/devonalanakins/mizvo",
        }],
    }
    revoked = {
        **active,
        "work": {"visibility": "hidden", "source": "none", "state": "not-broadcasting"},
        "remote": {"visibility": "hidden", "tasks": []},
        "recent": [],
    }

    with server(True) as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1199, "height": 1312})
        page = context.new_page()

        def route_request(route):
            url = route.request.url
            if url == origin + "/api/activity/v4":
                calls.append(url)
                if state["mode"] == "failed":
                    route.fulfill(status=503, content_type="application/json", body="{}")
                else:
                    route.fulfill(
                        status=200, content_type="application/json",
                        body=json.dumps(active if state["mode"] == "active" else revoked),
                    )
            elif "/api/" in url or not url.startswith(origin + "/"):
                blocked.append(url)
                route.abort()
            else:
                route.continue_()

        page.route("**/*", route_request)
        try:
            assert page.goto(origin + PREVIEW, wait_until="networkidle").status == 200
            assert not calls, "Preview must not auto-read any source"
            assert page.locator("[data-v5-field-node][data-v5-verified]").count() == 0

            page.locator("[data-v5-preview-connect]").click()
            page.wait_for_function(
                "() => document.querySelector('[data-v5-work-summary]')?.textContent === 'Mizvo'",
                timeout=10000,
            )
            assert len(calls) == 1, "Must reuse exactly one existing V4 reader"
            assert page.locator('a[data-v5-field-slug="mizvo"]').get_attribute(
                "data-v5-verified"
            ) == "editor"
            assert page.locator('a[data-v5-field-slug="merit"]').get_attribute(
                "data-v5-verified"
            ) == "remote"
            assert "Public GitHub history" in page.locator(
                "[data-v5-github-summary]"
            ).inner_text()

            page.locator('a[data-v5-field-slug="mizvo"]').click()
            assert page.locator("#v5-field-inspector").is_visible()
            assert "Editor observed" in page.locator(
                "[data-v5-field-evidence]"
            ).inner_text()
            page.keyboard.press("Escape")
            assert page.locator("#v5-field-inspector").is_hidden()

            # Revocation must remove the green/amber activity markers on a
            # new V4 fetch; no cached activity can survive consent withdrawal.
            state["mode"] = "revoked"
            page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
            page.wait_for_function(
                "() => document.querySelector('[data-v5-work-summary]')"
                "?.textContent === 'No fresh, verified public work'",
                timeout=10000,
            )
            assert len(calls) >= 2
            assert page.locator("[data-v5-field-node][data-v5-verified]").count() == 0
            assert "No approved public GitHub history" in page.locator(
                "[data-v5-github-summary]"
            ).inner_text()

            # Transport failure must also remain quiet, not restore stale
            # work from earlier successful responses.
            state["mode"] = "failed"
            before = len(calls)
            page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
            # The V4 reader intentionally clears the UI *before* refetch.
            # Wait for the failed network request as separate evidence so
            # a local reset cannot be mistaken for a tested transport failure.
            for _ in range(50):
                if len(calls) > before:
                    break
                page.wait_for_timeout(100)
            assert len(calls) > before, "Expected a second V4 request"
            page.wait_for_function(
                "() => document.querySelector('[data-v5-preview-source-state]')"
                "?.textContent === 'Public source unavailable, disabled or stale'",
                timeout=10000,
            )
            assert page.locator("[data-v5-field-node][data-v5-verified]").count() == 0
            assert not blocked, "No other API or external URL should be requested"
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        finally:
            context.close()
            browser.close()
    print("V5 public V4 source browser gate passed: opt-in, single reader, editor,"
          " independent task, approved history, revocation and failure clearing.")


if __name__ == "__main__":
    run()
