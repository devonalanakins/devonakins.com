#!/usr/bin/env python3
"""Produce source-accurate screenshots of the gated, current V5 PR head.

No production writes, provider data, credentials, or synthetic telemetry.
Images are review artifacts, not an assertion of release readiness.
"""
import json
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
from v5_browser_acceptance import PREVIEW, server

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "v5-review-screenshots"
CASES = [
    ("home", "", 1199, 1312),
    ("home", "", 1440, 900),
    ("home", "", 1280, 800),
    ("home", "", 390, 844),
    ("home", "", 375, 667),
    ("home", "", 320, 568),
    ("signal-field", "field/", 1440, 900),
    ("projects", "projects/", 1440, 900),
]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    manifest = {"head_commit": sha, "preview_only": True, "no_provider_requests": True, "screenshots": []}
    with server(True) as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            for name, path, width, height in CASES:
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                    reduced_motion="reduce",
                )
                page = context.new_page()
                page_errors, remote_requests, api_requests = [], [], []
                page.on("pageerror", lambda err: page_errors.append(str(err)))
                def route_request(route):
                    url = route.request.url
                    if "/api/" in url:
                        api_requests.append(url)
                        route.abort()
                    elif not url.startswith(origin + "/"):
                        remote_requests.append(url)
                        route.abort()
                    else:
                        route.continue_()
                page.route("**/*", route_request)
                response = page.goto(origin + PREVIEW + path, wait_until="networkidle")
                assert response and response.status == 200, (name, width, height)
                page.evaluate("() => document.fonts.ready")
                if name == "home":
                    page.locator("[data-v5-exact-reference]").wait_for()
                    page.locator(".v5-locked-portrait picture img").wait_for()
                    assert page.locator(".v5-locked-portrait picture img").evaluate(
                        "e => e.complete && e.naturalWidth > 0")
                page.wait_for_timeout(450)
                file = f"{name}-{width}x{height}.png"
                page.screenshot(path=str(OUT / file), full_page=True, animations="disabled")
                geometry = page.evaluate("""() => ({
                    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
                    fullHeight: document.documentElement.scrollHeight,
                    activeWebGL: !!document.querySelector('[data-webgl="ready"]'),
                    workState: document.querySelector('[data-v5-signal="work"]')?.textContent?.trim() ?? null,
                    spotifyState: document.querySelector('[data-v5-signal="spotify"]')?.textContent?.trim() ?? null,
                    gptState: document.querySelector('[data-v5-signal="gpt"]')?.textContent?.trim() ?? null
                })""")
                assert not api_requests, "Review screenshots must not call provider APIs"
                assert not remote_requests, "Review screenshots must not call third parties"
                assert not page_errors, (file, page_errors)
                manifest["screenshots"].append({"file": file, "route": PREVIEW + path,
                    "viewport": [width, height], **geometry})
                context.close()
        finally:
            browser.close()
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Captured {len(manifest['screenshots'])} actual V5 screenshots from {sha}")

if __name__ == "__main__":
    main()
