#!/usr/bin/env python3
"""Development-only V5 shell: real HTTP, no live providers or credentials."""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = "/__v5_preview__/"
PAGES = ["", "field/", "projects/", "writing/", "research/", "knowledge/", "about/"]
VIEWPORTS = [(1440, 900), (1199, 1312), (1280, 800), (1024, 768), (768, 900), (390, 844), (375, 667), (320, 568), (844, 320)]

@contextmanager
def server(enabled):
    with socket.socket() as reserve:
        reserve.bind(("127.0.0.1", 0))
        port = reserve.getsockname()[1]
    env = dict(os.environ)
    env["V5_PREVIEW"] = "1" if enabled else "0"
    # Loopback avoids Vite enumerating unavailable container network interfaces.
    process = subprocess.Popen(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(port), "--strictPort"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    origin = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise AssertionError("Vite failed: " + process.stderr.read().decode())
            try:
                urllib.request.urlopen(origin + "/", timeout=1).close()
                break
            except (OSError, urllib.error.URLError):
                time.sleep(.1)
        else:
            raise AssertionError("Vite did not become ready")
        yield origin
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        process.stderr.close()


def check_page(page, origin, path, axe):
    response = page.goto(origin + PREVIEW + path, wait_until="networkidle")
    assert response.status == 200
    assert "noindex" in response.headers.get("x-robots-tag", "")
    assert response.headers.get("cache-control") == "no-store"
    assert page.locator("h1").count() == 1
    if not path and page.locator("[data-v5-exact-reference]").count():
        assert page.locator(".v5-lock-project-grid .v5-lock-project").count() == 5
        # The artwork must be genuinely full-bleed, not collapsed to the
        # global 21px SVG icon rule.
        assert page.locator(".v5-lock-project svg.v5-lock-project-art").evaluate_all(
            "nodes => nodes.length === 5 && nodes.every(svg => { "
            "const card=svg.closest('.v5-lock-project').getBoundingClientRect();"
            "const art=svg.getBoundingClientRect();"
            "return art.width >= card.width * .9 && art.height >= card.height * .9; })"
        ), (page.viewport_size, "project illustration too small")
        assert page.locator(".v5-lock-project-brand").count() == 5

        field = page.locator(".v5-lock-field")
        assert field.locator(".v5-lock-beam").count() == 8
        assert field.locator("a.v5-lock-beam-link").count() == 8
        assert field.locator(".v5-field-inspector").is_hidden()
        assert field.locator("a.v5-lock-beam-link").evaluate_all(
            "es => es.every(e => e.getBoundingClientRect().height >= 43)"
        ), "project node touch targets must be at least 44px high"
        assert "Static project composition" in field.inner_text()
        assert field.locator(".v5-lock-terrain-wire").evaluate("""svg => {
            const rect=svg.getBoundingClientRect();
            const parent=svg.closest('.v5-lock-terrain').getBoundingClientRect();
            return rect.width >= parent.width * .95 && rect.height >= parent.height * .95;
        }"""), "SVG fallback field is collapsed"

        assert page.locator(".v5-lock-triple .v5-lock-panel").count() == 3
        assert page.locator(".v5-lock-top-nav a").count() == 7
        assert page.locator("[data-v5-search-toggle]").count() == 1
        assert page.locator(".v5-locked-portrait picture img").count() == 1
        portrait_box = page.locator(".v5-locked-portrait")
        assert portrait_box.evaluate("e => Number(getComputedStyle(e).zIndex) >= 0"), (
            page.viewport_size, "approved portrait hidden behind page background")
        assert portrait_box.evaluate("e => e.getBoundingClientRect().width > 80")
        if page.viewport_size["width"] >= 901:
            assert page.locator(".v5-locked-hero").evaluate(
                "e => getComputedStyle(e).backgroundImage.includes('portrait-anevum-transcosmic.webp')"
            ), "Desktop hero must paint the approved portrait asset"
        else:
            assert portrait_box.evaluate(
                "e => Number(getComputedStyle(e).opacity) > .1"
            ), "Mobile responsive portrait should remain visible"

        if page.viewport_size["width"] <= 360:
            for selector in [".v5-topbar", ".v5-brand", ".v5-lock-search-toggle",
                             ".v5-mobile-menu", ".v5-mobile-menu summary"]:
                assert page.locator(selector).evaluate("""e => {
                    const r=e.getBoundingClientRect();
                    return r.left >= -1 && r.right <= innerWidth + 1;
                }"""), (page.viewport_size, selector, "mobile header clipped")

        assert page.locator(".v5-locked-rail a").count() == 9
        if page.viewport_size["width"] >= 1000:
            rects = page.locator(".v5-locked-hero, .v5-lock-projects, .v5-lock-triple, .v5-lock-field").evaluate_all(
                "items => items.map(e => { const b=e.getBoundingClientRect(); return {left:b.left,top:b.top,width:b.width,height:b.height}; })"
            )
            assert len(rects) == 4
            assert rects[0]["height"] >= 440
            assert rects[0]["top"] < rects[1]["top"] < rects[2]["top"] < rects[3]["top"]
            assert rects[3]["width"] >= page.viewport_size["width"] * .95

    assert page.locator("nav a[aria-current=page]:visible").count() in [0, 1]
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (path, "horizontal overflow")
    github_profile = page.locator("a[href='https://github.com/devonalanakins']")
    if not path and page.locator("[data-v5-exact-reference]").count():
        # Three distinct screenshot regions deliberately link to one public GitHub profile.
        # Keep each semantic link, rather than dropping the screenshot's left rail/panel.
        assert github_profile.count() == 3
        for region in [".v5-locked-rail", ".v5-locked-socials", ".v5-lock-panel"]:
            assert page.locator(f"{region} a[href='https://github.com/devonalanakins']").count() == 1
    else:
        assert github_profile.count() <= 1
    if not path:
        assert page.locator(".v5-locked-portrait picture source").count() == 1
        portrait = page.locator(".v5-locked-portrait img")
        assert portrait.evaluate("e => e.complete && e.naturalWidth === (innerWidth <= 600 ? 768 : 1122) && e.naturalHeight > 0"), (path, page.viewport_size, "approved responsive portrait failed to decode")
        assert portrait.get_attribute("alt").startswith("Cinematic portrait artwork of Devon Akins")
        assert page.locator(".v5-locked-portrait picture").evaluate("e => e.getBoundingClientRect().height > 0")

        if page.viewport_size["height"] >= 568:
            for source in ["work", "spotify", "gpt"]:
                assert page.locator(f'[data-v5-signal="{source}"]').evaluate("e => { const r=e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }"), (page.viewport_size, source, "below first viewport")
    targets = page.locator("a:visible, summary:visible").evaluate_all("es => es.filter(e => !e.classList.contains('v5-skip')).filter(e => e.getBoundingClientRect().height < 43).map(e => ({text:e.textContent, h:e.getBoundingClientRect().height}))")
    assert not targets, (path, "small touch targets", targets)
    page.add_script_tag(content=axe)
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))""")
    assert not violations, (path, violations)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=".artifacts/v5-preview")
    parser.add_argument("--engines", nargs="+", choices=["chromium", "webkit"], default=["chromium", "webkit"])
    parser.add_argument("--chromium-executable", default=None)
    parser.add_argument("--fresh-browser-per-case", action="store_true", help="For constrained single-process browser runtimes")
    args = parser.parse_args()
    output = ROOT / args.out
    output.mkdir(parents=True, exist_ok=True)
    axe = (ROOT / "node_modules/axe-core/axe.min.js").read_text()
    results = []
    with server(False) as origin:
        for path in PAGES:
            try:
                urllib.request.urlopen(origin + PREVIEW + path)
                raise AssertionError("Disabled preview was exposed")
            except urllib.error.HTTPError as error:
                assert error.code == 404
    with server(True) as origin, sync_playwright() as playwright:
        for engine in args.engines:
            options = {"executable_path": args.chromium_executable} if engine == "chromium" and args.chromium_executable else {}
            browser = getattr(playwright, engine).launch(**options)
            try:
                for width, height in VIEWPORTS:
                    for motion in ["reduce", "no-preference"] if (width, height) in [(390, 844), (1440, 900)] else ["reduce"]:
                        context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion=motion)
                        page = context.new_page()
                        errors, api, external = [], [], []
                        page.on("pageerror", lambda error: errors.append(str(error)))
                        def route_request(route):
                            url = route.request.url
                            if "/api/" in url:
                                api.append(url)
                            if not url.startswith(origin + "/"):
                                external.append(url)
                                route.abort()
                            else:
                                route.continue_()
                        page.route("**/*", route_request)
                        try:
                            for path in PAGES:
                                check_page(page, origin, path, axe)
                            page.goto(origin + PREVIEW, wait_until="networkidle")
                            if width <= 900:
                                page.locator("summary").click()
                                assert page.locator(".v5-mobile-nav").is_visible()
                                page.keyboard.press("Escape")
                                assert page.locator(".v5-mobile-nav").is_hidden()
                                assert page.locator("summary").evaluate("e => e === document.activeElement")
                                page.locator("summary").click()
                                page.locator(".v5-mobile-nav a").filter(has_text="Projects").click()
                                assert page.url.endswith("projects/")
                            else:
                                page.locator(".v5-desktop-nav a").filter(has_text="Projects").click()
                                assert page.url.endswith("projects/")
                            page.goto(origin + PREVIEW, wait_until="networkidle")
                            field_node = page.locator('a[data-v5-field-slug="mizvo"]')
                            field_node.focus()
                            page.keyboard.press("Enter")
                            assert page.locator("#v5-field-inspector").is_visible()
                            assert page.locator("#v5-field-inspector [data-v5-field-title]").inner_text() == "Mizvo"
                            assert "AGPL review build" in page.locator("#v5-field-inspector [data-v5-field-status]").inner_text()
                            assert page.locator("[data-v5-field-open]").get_attribute("href").endswith("/work/mizvo/")
                            assert field_node.get_attribute("aria-expanded") == "true"
                            page.keyboard.press("Escape")
                            assert page.locator("#v5-field-inspector").is_hidden()
                            assert field_node.get_attribute("aria-expanded") == "false"
                            assert field_node.evaluate("e => e === document.activeElement")
                            page.screenshot(path=str(output / f"{engine}-{width}x{height}-{motion}.png"), full_page=True)
                            page.keyboard.press("Tab")
                            assert page.locator(".v5-skip").evaluate("e => e === document.activeElement")
                            page.keyboard.press("Enter")
                            assert page.locator("main").evaluate("e => e === document.activeElement")
                            assert not errors, errors
                            assert not api, api
                            assert not external, external
                            results.append({"engine": engine, "viewport": [width, height], "motion": motion, "routes": len(PAGES), "result": "pass"})
                        except Exception:
                            page.screenshot(path=str(output / f"FAILED-{engine}-{width}x{height}.png"), full_page=True)
                            raise
                        finally:
                            context.close()
                            if args.fresh_browser_per_case:
                                browser.close()
                                browser = getattr(playwright, engine).launch(**options)
                context = browser.new_context(viewport={"width": 390, "height": 844}, java_script_enabled=False)
                page = context.new_page()
                for path in PAGES:
                    assert page.goto(origin + PREVIEW + path).status == 200
                    assert page.locator("h1").is_visible()
                assert page.locator('a[data-v5-field-slug="mizvo"]').get_attribute("href") == "/work/mizvo/"
                page.locator("summary").click()
                page.locator(".v5-mobile-nav a").filter(has_text="Writing").click()
                assert page.url.endswith("writing/")
                context.close()
                if engine == "chromium":
                    # The default preview remains source-free. This test
                    # explicitly opts in, then serves only a local synthetic
                    # PUBLIC V4 fixture to exercise the real UI adapter.
                    from datetime import datetime, timedelta, timezone
                    def timestamp(time):
                        return time.isoformat(timespec="milliseconds").replace("+00:00","Z")
                    now=datetime.now(timezone.utc)
                    recent=timestamp(now-timedelta(seconds=30))
                    work_at=timestamp(now-timedelta(seconds=10))
                    task_at=timestamp(now-timedelta(seconds=12))
                    task_end=timestamp(now+timedelta(seconds=85))
                    payload={
                        "version":4,"asOf":timestamp(now),
                        "work":{"version":1,"visibility":"public","source":"editor-heartbeat",
                                "project":"Mizvo","state":"developing","asOf":work_at},
                        "remote":{"version":1,"visibility":"public","tasks":[
                            {"source":"codex","project":"Merit","state":"running","checkpoint":None,
                             "asOf":task_at,"expiresAt":task_end},
                        ]},
                        "recent":[{"project":"Mizvo","projectSlug":"mizvo","kind":"Commit",
                                   "url":"https://github.com/devonalanakins/mizvo","at":recent}],
                        "spotify":{"version":1,"mode":"hidden","detailsVisible":False},
                        "gpt":{"state":"disconnected","scope":"personal-work-codex","observations":[]},
                    }
                    revoked={
                        **payload,
                        "work":{"visibility":"hidden","source":"none","state":"not-broadcasting"},
                        "remote":{"visibility":"hidden","tasks":[]},
                        "recent":[],
                    }
                    context=browser.new_context(viewport={"width":1199,"height":1312})
                    page=context.new_page()
                    public_calls=[]
                    rejected=[]
                    status={"mode":"live"}
                    def route_public(route):
                        url=route.request.url
                        if url == origin + "/api/activity/v4":
                            public_calls.append(url)
                            route.fulfill(status=200,content_type="application/json",
                                          body=json.dumps(payload if status["mode"]=="live" else revoked))
                        elif "/api/" in url or not url.startswith(origin+"/"):
                            rejected.append(url)
                            route.abort()
                        else:
                            route.continue_()
                    page.route("**/*",route_public)
                    page.goto(origin+PREVIEW,wait_until="networkidle")
                    assert not public_calls, "preview must never start an implicit source request"
                    assert page.locator("[data-v5-field-node][data-v5-verified]").count()==0
                    page.locator("[data-v5-preview-connect]").click()
                    page.wait_for_function(
                        "() => document.querySelector('[data-v5-work-summary]')?.textContent === 'Mizvo'",
                        timeout=10000,
                    )
                    assert len(public_calls)==1, "one V4 polling client, not duplicate readers"
                    assert page.locator('a[data-v5-field-slug="mizvo"]').get_attribute("data-v5-verified")=="editor"
                    assert page.locator('a[data-v5-field-slug="merit"]').get_attribute("data-v5-verified")=="remote"
                    assert "Public GitHub history" in page.locator("[data-v5-github-summary]").inner_text()
                    page.locator('a[data-v5-field-slug="mizvo"]').click()
                    assert page.locator("#v5-field-inspector").is_visible()
                    assert "Editor observed" in page.locator("[data-v5-field-evidence]").inner_text()
                    page.keyboard.press("Escape")
                    status["mode"]="revoked"
                    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
                    for _ in range(30):
                        if len(public_calls)>=2:
                            break
                        page.wait_for_timeout(100)
                    assert len(public_calls)>=2, "revocation must cause a new public-only read"
                    page.wait_for_function(
                        "() => document.querySelectorAll('[data-v5-field-node][data-v5-verified]').length === 0",
                        timeout=10000,
                    )
                    assert "No fresh" in page.locator("[data-v5-work-summary]").inner_text()
                    assert not rejected, rejected
                    context.close()
            finally:
                browser.close()
    (output / "report.json").write_text(json.dumps(results, indent=2))
    print(f"V5 acceptance passed: {len(results)} engine/viewport/motion cases; seven routes each, no-JS, WCAG, navigation, zero API/provider requests.")

if __name__ == "__main__":
    main()
