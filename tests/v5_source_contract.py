#!/usr/bin/env python3
"""Focused, synthetic V5 consent/revocation browser gate.

Uses the real Vite preview and Chromium. Public V4 responses are intercepted
locally; no account secrets or provider requests are used. This does not
constitute a production source-connection acceptance test.
"""
from datetime import datetime, timedelta, timezone
import json
import urllib.request
from pathlib import Path

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
        "spotify": {
            "version": 1, "mode": "playing", "detailsVisible": True,
            "updatedAt": stamp(now - timedelta(seconds=7)),
            "track": {
                "title": "Fixture Track", "artist": "Fixture Artist",
                "album": "Test", "image": None,
                "url": "https://open.spotify.com/track/AbCdEfGhIjKlMnOpQrStUv",
            },
            "playback": {"durationMs": 240000, "progressMs": 35000},
        },
        "threads": {
            "version": 1, "state": "connected", "checkedAt": stamp(now),
            "posts": [
                {
                    "href": "https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V",
                    "text": "<img onerror=alert(1)> Verified Threads fixture " + ("longunbrokenthreadstext" * 10),
                    "publishedAt": stamp(now - timedelta(minutes=16)),
                    "media": False,
                },
            ],
        },
        "gpt": {
            "state": "snapshot", "scope": "owner-profile",
            "metric": "profile_7d_tokens", "period": "7d",
            "count": 143204887, "unit": "tokens", "label": "7-day tokens",
            "asOf": stamp(now - timedelta(minutes=8)),
            "source": "owner-profile-capture", "sourceUpdatedAt": None,
            "freshness": "recent",
            "observations": [
                {"metric": "profile_7d_tokens", "unit": "tokens",
                 "scope": "owner-profile", "source": "owner-profile-capture",
                 "value": 143204887, "asOf": stamp(now - timedelta(minutes=8)),
                 "sourceUpdatedAt": None, "freshness": "recent"},
                {"metric": "profile_lifetime_tokens_approx", "unit": "tokens",
                 "scope": "owner-profile", "source": "owner-profile-capture",
                 "value": 2310000000, "asOf": stamp(now - timedelta(minutes=8)),
                 "sourceUpdatedAt": None, "freshness": "recent"},
                {"metric": "work_codex_credits_used", "unit": "credits",
                 "scope": "work-codex", "source": "owner-work-codex-usage",
                 "value": 1.5, "asOf": stamp(now - timedelta(minutes=8)),
                 "sourceUpdatedAt": None, "freshness": "recent"},
            ],
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
        "spotify": {"version": 1, "mode": "hidden", "detailsVisible": False},
        "gpt": {"state": "disconnected", "observations": []},
        "threads": {"version": 1, "state": "disconnected", "checkedAt": None, "posts": []},
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
            assert not [u for u in blocked if "/api/presence/note" in u], (
                "Design preview must not auto-fetch the owner profile note"
            )
            assert page.locator("[data-v5-field-node][data-v5-verified]").count() == 0

            page.locator("[data-v5-preview-connect]").click()
            page.wait_for_function(
                "() => document.querySelector('[data-v5-work-summary]')?.textContent === 'Mizvo'",
                timeout=10000,
            )
            assert len(calls) == 1, "Must reuse exactly one existing V4 reader"
            assert not [u for u in blocked if "/api/presence/note" in u], (
                "Manual V4 preview is not authorization to read the owner note"
            )
            # The GPU is optional. When available, verify that exactly the
            # public editor/remote nodes light; history remains neutral.
            gpu_ready = page.locator(".v5-lock-terrain").get_attribute("data-webgl") == "ready"
            if gpu_ready:
                page.wait_for_function(
                    "() => document.querySelector('.v5-lock-terrain')"
                    "?.dataset.v5TerrainVerifiedCount === '2'",
                    timeout=10000,
                )
            assert page.locator('a[data-v5-field-slug="mizvo"]').get_attribute(
                "data-v5-verified"
            ) == "editor"
            assert page.locator('a[data-v5-field-slug="merit"]').get_attribute(
                "data-v5-verified"
            ) == "remote"
            assert "Public GitHub history" in page.locator(
                "[data-v5-github-summary]"
            ).inner_text()
            assert page.locator("[data-v5-spotify-title]").inner_text() == "Fixture Track"
            assert page.locator("[data-v5-spotify-artist]").inner_text() == "Fixture Artist"
            assert page.locator("[data-v5-spotify-progress]").is_visible()
            assert page.locator("[data-v5-threads-feed]").is_visible()
            assert page.locator("[data-v5-threads-status]").inner_text() == "SOURCE CONNECTED"
            assert page.locator("[data-v5-threads-posts] li").count() == 1
            assert "Official posts connected" in page.locator(
                "[data-v5-home-threads-status]"
            ).inner_text()
            assert page.locator('[data-v5-home-activity-list] [data-activity-source="threads"]').count() == 1
            assert "Verified Threads fixture" in page.locator(
                '[data-v5-home-activity-list] [data-activity-source="threads"]'
            ).inner_text()
            assert page.locator(
                '[data-v5-home-activity-list] [data-activity-source="threads"] img'
            ).count() == 0, "Threads text must not execute provider HTML"
            assert "Verified Threads fixture" in page.locator(
                "[data-v5-threads-posts] li a"
            ).inner_text()
            assert page.locator("[data-v5-threads-posts] img").count() == 0
            assert page.locator("[data-v5-threads-posts] li a").get_attribute("href") == (
                "https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V"
            )
            assert "noopener" in page.locator("[data-v5-threads-posts] li a").get_attribute("rel")
            # Capture visible, untrusted-but-sanitized synthetic Threads text.
            # These are never real owner posts, engagements or account data.
            from pathlib import Path
            screenshots = Path(__file__).resolve().parents[1] / "v5-review-screenshots"
            screenshots.mkdir(exist_ok=True)
            page.screenshot(
                path=str(screenshots / "THREADS-FEED-SYNTHETIC-1199x1312.png"),
                full_page=True, animations="disabled",
            )
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.locator("[data-v5-threads-feed]").is_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (
                "Approved Threads feed must not cause overflow on phone-sized screens"
            )
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(
                path=str(screenshots / "THREADS-FEED-SYNTHETIC-390x844.png"),
                full_page=True, animations="disabled",
            )
            page.set_viewport_size({"width": 1199, "height": 1312})

            assert page.locator("[data-v5-gpt-capture]").is_visible()
            assert page.locator("[data-v5-gpt-empty]").is_hidden()
            assert page.locator("[data-v5-gpt-primary]").inner_text() == "143.2M"
            assert "7-day tokens" in page.locator("[data-v5-gpt-primary-label]").inner_text()
            assert page.locator("[data-v5-gpt-readings] li").count() == 2
            assert "credits" in page.locator("[data-v5-gpt-readings] li").last.inner_text()
            assert page.locator("[data-v5-gpt-time]").get_attribute("datetime") == (
                active["gpt"]["asOf"]
            )
            # Capture the actual browser UI using explicitly synthetic owner
            # fixture data; this image is not a claim about live GPT usage.
            review = Path(__file__).resolve().parents[1] / "v5-review-screenshots"
            review.mkdir(exist_ok=True)
            page.screenshot(
                path=str(review / "GPT-OWNER-CAPTURE-SYNTHETIC-1199x1312.png"),
                full_page=True, animations="disabled",
            )
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.locator("[data-v5-gpt-capture]").is_visible()
            assert page.locator("[data-v5-gpt-readings] li").count() == 2
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (
                "Owner-captured GPT values must not overflow on iPhone-size screens"
            )
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(
                path=str(review / "GPT-OWNER-CAPTURE-SYNTHETIC-390x844.png"),
                full_page=True, animations="disabled",
            )
            page.set_viewport_size({"width": 1199, "height": 1312})
            assert page.locator(".v5-lock-spotify").get_attribute("href").startswith(
                "https://open.spotify.com/track/"
            )

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
            if gpu_ready:
                page.wait_for_function(
                    "() => document.querySelector('.v5-lock-terrain')"
                    "?.dataset.v5TerrainVerifiedCount === '0'",
                    timeout=10000,
                )
            assert "No approved public GitHub history" in page.locator(
                "[data-v5-github-summary]"
            ).inner_text()
            # V4 may normalize revoked playback to hidden or unavailable.
            # The invariant is absence of the previously exposed track.
            page.wait_for_function(
                "() => document.querySelector('[data-v5-spotify-title]')"
                "?.textContent !== 'Fixture Track'",
                timeout=10000,
            )
            assert page.locator("[data-v5-spotify-title]").inner_text() != "Fixture Track"
            assert page.locator("[data-v5-spotify-progress]").is_hidden()
            assert page.locator("[data-v5-threads-feed]").is_hidden()
            assert page.locator("[data-v5-threads-status]").inner_text() == "CONNECTION PENDING"
            assert page.locator("[data-v5-threads-posts] li").count() == 0
            assert page.locator('[data-v5-home-activity-list] [data-activity-source="threads"]').count() == 0
            assert "Connection pending" in page.locator(
                "[data-v5-home-threads-status]"
            ).inner_text()
            assert page.locator("[data-v5-gpt-capture]").is_hidden()
            assert page.locator("[data-v5-gpt-empty]").is_visible()
            assert page.locator("[data-v5-gpt-readings] li").count() == 0
            assert page.locator("[data-v5-gpt-primary]").inner_text() == ""
            assert page.locator(".v5-lock-spotify").get_attribute("href") == "/listening/"

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
            if gpu_ready:
                assert page.locator(".v5-lock-terrain").get_attribute(
                    "data-v5-terrain-verified-count"
                ) == "0", "Transport failure must not resurrect stale GPU activity"
            assert not blocked, "No other API or external URL should be requested"
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")

            # Synthetic release-renderer acceptance, NOT a live deployment.
            # The verified preview HTML is served at the site root with a
            # deliberate server-side release marker; no query flag can do this.
            with urllib.request.urlopen(origin + PREVIEW, timeout=5) as response:
                release_html = response.read().decode("utf-8")
            preview_marker = 'data-v5-signal-mode="preview"'
            assert preview_marker in release_html
            release_html = release_html.replace(
                preview_marker, 'data-v5-signal-mode="released-v5"', 1,
            )
            release_context = browser.new_context(
                viewport={"width": 1199, "height": 1312},
            )
            release_page = release_context.new_page()
            release_calls = []
            release_blocked = []
            def release_route(route):
                url = route.request.url
                if url == origin + "/":
                    route.fulfill(
                        status=200, content_type="text/html", body=release_html,
                    )
                elif url == origin + "/api/activity/v4":
                    release_calls.append(url)
                    route.fulfill(
                        status=200, content_type="application/json",
                        body=json.dumps(active),
                    )
                elif "/api/" in url or not url.startswith(origin + "/"):
                    release_blocked.append(url)
                    route.abort()
                else:
                    route.continue_()
            release_page.route("**/*", release_route)
            try:
                assert release_page.goto(
                    origin + "/", wait_until="networkidle",
                ).status == 200
                release_page.wait_for_function(
                    "() => document.querySelector('[data-v5-work-summary]')"
                    "?.textContent === 'Mizvo'",
                    timeout=10000,
                )
                assert len(release_calls) == 1, (
                    "Released homepage should start one V4 reader automatically"
                )
                assert release_page.locator(
                    "[data-v5-preview-connect]"
                ).is_hidden(), "No preview control on automatic released mode"
                assert release_page.locator(
                    'a[data-v5-field-slug="mizvo"]'
                ).get_attribute("data-v5-verified") == "editor"
                assert not release_blocked, release_blocked
            finally:
                release_context.close()
        finally:
            context.close()
            browser.close()
    print("V5 public source browser gate passed: opt-in, single reader, editor,"
          " independent task, approved history, revocation, failure clearing,"
          " and synthetic released-home automatic startup.")


if __name__ == "__main__":
    run()
