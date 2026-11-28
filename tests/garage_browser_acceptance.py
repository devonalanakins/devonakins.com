"""Review-only Garage browser acceptance; no production or media access."""
import functools
import http.server
import pathlib
import os
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / "dist"))
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f"http://127.0.0.1:{server.server_port}"
out = ROOT / "browser-qa" / "garage"
out.mkdir(parents=True, exist_ok=True)

HOME = os.environ.get("GARAGE_HOME_CANDIDATE") == "1"
ENTRY = "/" if HOME else "/garage/"

def open_preview(page, path=ENTRY):
    response = page.goto(origin + path)
    assert response and response.status == 200
    expect(page.get_by_role("heading", name="The Devon Alan Akins Podcast.")).to_be_visible()
    expect(page.get_by_role("link", name="Explore the podcast")).to_be_visible()
    assert page.get_by_role("link", name="Explore the podcast").get_attribute("href") == "/podcast/"
    expect(page.locator('[data-zone="podcast"]')).to_have_attribute("aria-pressed","true")
    expect(page.locator("#episode-title")).to_be_visible()
    expect(page.get_by_text("No camera connected")).to_be_visible()
    overflow = page.evaluate("""() => ({width: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0,12).map(e => [e.tagName,e.id,e.className?.baseVal || e.className])})""")
    assert overflow["scroll"] <= overflow["width"], overflow
    assert page.locator("iframe,video").count() == 0
    assert page.locator("body").get_attribute("data-garage-preview") == "true"
    assert page.locator('meta[name="robots"]').get_attribute("content") == "noindex,nofollow"
    assert page.evaluate("""() => {const r=document.querySelector("#viewport").getBoundingClientRect();const p=document.querySelector(".stage").getBoundingClientRect();return r.width<=p.width && r.right<=p.right+1}"""), "Viewport exceeds its stage"

try:
    with sync_playwright() as p:
        for name, engine in (("chromium", p.chromium), ("webkit", p.webkit)):
            options = {"args":["--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]} if name == "chromium" else {}
            browser = engine.launch(**options)
            for width in (320, 393, 1440):
                page = browser.new_page(viewport={"width":width,"height":900}, reduced_motion="reduce")
                open_preview(page)
                page.get_by_text("Menu", exact=True).click()
                expect(page.get_by_role("navigation", name="Site navigation")).to_be_visible()
                page.get_by_text("Menu", exact=True).click()
                page.get_by_role("link", name="Explore the podcast").focus()
                expect(page.get_by_role("link", name="Explore the podcast")).to_be_focused()
                expect(page.locator(".editorial-grid")).to_be_visible()
                assert page.locator(".editorial-card").count() == 6
                for anchor in page.locator(".zones a, .hero-actions a, .episode-link, .discover a, .menu nav a, .editorial-card-link").all():
                    href = anchor.get_attribute("href")
                    assert page.request.get(origin + href).ok, href
                page.locator("img[loading=lazy]").evaluate_all("(images) => images.forEach(i => i.loading = \"eager\")")
                for img in page.locator(".hero-portrait img, .editorial-card-media img").all():
                    expect(img).to_be_visible()
                    img.evaluate("(img) => img.decode()")
                    assert img.evaluate("(img) => img.naturalWidth > 0")
                page.screenshot(path=str(out / f"{name}-{width}-illustration.png"), full_page=True)
                if name == "chromium" and width == 320:
                    page.add_script_tag(path=str(ROOT / "node_modules" / "axe-core" / "axe.min.js"))
                    violations = page.evaluate("""async () => (await axe.run({runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}})).violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))""")
                    assert not violations, violations
                page.close()
            page = browser.new_page(java_script_enabled=False, viewport={"width":393,"height":852})
            page.goto(origin + ENTRY)
            expect(page.locator("#studio-fallback-note")).to_be_visible()
            expect(page.locator("#enable")).to_be_hidden()
            expect(page.locator(".fallback")).to_be_visible()
            expect(page.get_by_role("link", name="Explore the podcast")).to_be_visible()
            expect(page.get_by_role("link", name="Live ↗", exact=True)).to_be_visible()
            page.close()
            if HOME:
                page = browser.new_page(viewport={"width":393,"height":852})
                open_preview(page, "/garage/")
                page.get_by_role("link", name="Explore the podcast").click()
                assert page.url == origin + "/podcast/"
                assert page.locator("body").get_attribute("data-garage-preview") is None
                assert page.locator("html").get_attribute("data-garage-editorial") == "true"
                page.close()
            # Simulate a browser denying all WebGL contexts; ordinary links must survive.
            page = browser.new_page()
            page.add_init_script("""const original = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type,...args) {
                  if(String(type).startsWith('webgl') || type === 'experimental-webgl') return null;
                  return original.call(this,type,...args);
                };""")
            open_preview(page)
            page.get_by_role("button", name="Enable 3D").click()
            expect(page.get_by_role("status")).to_contain_text("3D could not start", timeout=20000)
            expect(page.locator(".fallback")).to_be_visible()
            expect(page.get_by_role("button", name="Enable 3D")).to_be_focused()
            page.close()
            if name == "chromium":
                page = browser.new_page(viewport={"width":1440,"height":1000})
                open_preview(page)
                for cycle in range(2):
                    page.get_by_role("button", name="Enable 3D").click()
                    expect(page.get_by_role("status")).to_contain_text("3D concept enabled", timeout=30000)
                    expect(page.locator("#canvas-host canvas")).to_have_count(1)
                    for button in page.locator("[data-zone]").all():
                        button.click()
                        expect(button).to_have_attribute("aria-pressed","true")
                        assert page.locator('[data-zone][aria-pressed="true"]').count()==1
                    if cycle == 0:
                        page.screenshot(path=str(out / "chromium-3d.png"), full_page=True)
                    page.get_by_role("button", name="Return to illustration").click()
                    expect(page.locator("#canvas-host canvas")).to_have_count(0)
                    expect(page.get_by_role("button", name="Enable 3D")).to_be_focused()
                page.close()
            browser.close()
finally:
    server.shutdown()
    server.server_close()

print("Garage preview browser acceptance passed")
