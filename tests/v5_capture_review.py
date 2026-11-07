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
                # Check the actual browser-rendered image, not merely the
                # <img> load state. The approved golden viewport has a warm
                # portrait at this fixed reference pixel; the previous broken
                # desktop render was a dark empty surface.
                if name == "home" and width == 1199:
                    script = (
                        "import sharp from 'sharp';"
                        "const pixel = await sharp(process.argv[1])."
                        "extract({left:550,top:160,width:1,height:1}).raw().toBuffer();"
                        "process.stdout.write(JSON.stringify([...pixel]));"
                    )
                    portrait_sample = json.loads(subprocess.check_output(
                        ["node", "--input-type=module", "-e", script, str(OUT / file)],
                        cwd=ROOT, text=True,
                    ))
                    assert sum(portrait_sample[:3]) >= 300, (
                        "Golden screenshot portrait missing or too dark", portrait_sample)

                geometry = page.evaluate("""() => ({
                    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
                    fullHeight: document.documentElement.scrollHeight,
                    activeWebGL: !!document.querySelector('[data-webgl="ready"]'),
                    workState: document.querySelector('[data-v5-signal="work"]')?.textContent?.trim() ?? null,
                    spotifyState: document.querySelector('[data-v5-signal="spotify"]')?.textContent?.trim() ?? null,
                    gptState: document.querySelector('[data-v5-signal="gpt"]')?.textContent?.trim() ?? null
                })""")
                assert not geometry["overflow"], (file, "horizontal page overflow")

                if name == "home":
                    assert page.locator(".v5-lock-field .v5-lock-beam").count() == 8
                    if width >= 1199:
                        assert geometry["activeWebGL"], (
                            file, "desktop screenshot must capture actual GPU terrain")
                        assert page.locator(".v5-lock-terrain-canvas").evaluate(
                            "e => e.width > 300 && e.height > 80"
                        ), (file, "WebGL canvas did not render")
                    else:
                        assert not geometry["activeWebGL"], (
                            file, "phone should use SVG/DOM fallback")
                        assert page.locator(".v5-lock-terrain-wire").evaluate(
                            "e => e.getBoundingClientRect().width >= innerWidth * .9"
                        ), (file, "phone SVG field is missing")

                if name == "home" and height >= 568:
                    for source in ["work", "spotify", "gpt"]:
                        assert page.locator(f'[data-v5-signal="{source}"]').evaluate(
                            "e => { const r=e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }"
                        ), (file, source, "not in the first viewport")
                assert not api_requests, "Review screenshots must not call provider APIs"
                assert not remote_requests, "Review screenshots must not call third parties"
                assert not page_errors, (file, page_errors)
                manifest["screenshots"].append({"file": file, "route": PREVIEW + path,
                    "viewport": [width, height], **geometry})
                if name == "home" and width in (1199, 390):
                    # Inspect the *implemented* UI, not an illustrative mockup.
                    # Keyboard activation also exercises pointer-independent access.
                    node = page.locator('a[data-v5-field-slug="mizvo"]')
                    node.focus()
                    page.keyboard.press("Enter")
                    panel = page.locator("#v5-field-inspector")
                    assert panel.is_visible(), (file, "inspector not opened")
                    assert panel.locator("[data-v5-field-title]").inner_text() == "Mizvo"
                    assert "AGPL review build" in panel.locator("[data-v5-field-status]").inner_text()
                    assert node.get_attribute("aria-expanded") == "true"
                    open_file = f"inspector-mizvo-{width}x{height}.png"
                    page.screenshot(path=str(OUT / open_file), full_page=True, animations="disabled")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                    assert not api_requests and not remote_requests and not page_errors
                    manifest["screenshots"].append({
                        "file": open_file, "route": PREVIEW + path,
                        "viewport": [width, height], "inspector": "mizvo",
                        "source": "approved public portfolio", "provider_requests": 0
                    })
                    page.keyboard.press("Escape")
                    assert panel.is_hidden()
                    assert node.get_attribute("aria-expanded") == "false"
                context.close()
        finally:
            browser.close()
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Captured {len(manifest['screenshots'])} actual V5 screenshots from {sha}")

if __name__ == "__main__":
    main()
