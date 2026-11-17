"""Review-only laboratory candidate: meaningful UI, sources and responsive behavior."""
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4179"
OUT = Path("browser-qa/laboratory")
OUT.mkdir(parents=True, exist_ok=True)

server = subprocess.Popen(
    ["./node_modules/.bin/vite", "preview", "--host", "127.0.0.1",
     "--port", "4179", "--strictPort"],
    stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
)
try:
    for attempt in range(100):
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except Exception:
            if server.poll() is not None:
                raise AssertionError("Vite preview exited before acceptance")
            time.sleep(.2)
    else:
        raise AssertionError("Vite preview was not ready")

    with sync_playwright() as pw:
        for engine_name in ("chromium", "webkit"):
            engine = getattr(pw, engine_name)
            browser = engine.launch()
            try:
                sizes = (
                    (1440, 900), (1024, 768), (768, 1024),
                    (390, 844), (375, 667), (320, 568), (1920, 1080),
                )
                for width, height in sizes:
                    context = browser.new_context(
                        viewport={"width": width, "height": height},
                        reduced_motion="reduce" if width == 375 else "no-preference",
                    )
                    page = context.new_page()
                    page.goto(BASE, wait_until="domcontentloaded")
                    page.locator(".lab-intro h1").wait_for(state="visible", timeout=15000)
                    assert page.title() == "Devon Alan Akins — Computational Laboratory"
                    assert "Build the instrument" in page.locator(".lab-intro h1").inner_text()
                    assert page.locator('[data-public-github-feed]').count() == 2
                    assert page.locator('[data-public-spotify]').count() == 1
                    assert page.locator('.lab-gpt').count() == 1
                    assert 'Owner recording' in page.locator('.lab-gpt').inner_text()
                    assert page.locator('[data-public-work]').count() == 1
                    assert page.locator('[data-one-view]').count() == 6
                    assert page.locator('[data-one-view="home"]').is_visible()
                    assert page.locator('[data-one-view="work"]').is_hidden()
                    geometry = page.evaluate("""() => {
                        const el = document.querySelector('.lab-intro h1');
                        const box = el.getBoundingClientRect();
                        return {
                          scrollWidth: document.documentElement.scrollWidth,
                          viewport: window.innerWidth,
                          headingLeft: box.left, headingRight: box.right,
                          headingHeight: box.height,
                          pageScrollHeight: document.documentElement.scrollHeight,
                          pageHeight: window.innerHeight
                        };
                    }""")
                    assert geometry["scrollWidth"] <= geometry["viewport"] + 2, (
                        engine_name, width, geometry)
                    assert geometry["headingLeft"] >= -2 and geometry["headingRight"] <= width + 2, (
                        engine_name, width, geometry)
                    assert geometry["headingHeight"] > 35
                    page.screenshot(path=str(OUT / f"{engine_name}-home-{width}x{height}.png"))
                    nav = ("mobile" if width <= 760 else "desktop")
                    page.locator(f'.lab-tabs-{nav} [data-one-target="experience"]').click()
                    assert page.locator('[data-one-view="experience"]').is_visible()
                    assert page.locator('[data-one-view="home"]').is_hidden()
                    assert page.url.endswith("#experience"), page.url
                    path = page.locator('[data-lab-curve="interactive"]')
                    before = path.get_attribute("d")
                    slider = page.locator('[data-lab-axis="a"]')
                    slider.evaluate("""el => {
                        el.value = '5';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }""")
                    after = path.get_attribute("d")
                    assert after != before
                    assert "a = 5" in page.locator('[data-lab-model-caption]').inner_text()
                    page.screenshot(path=str(OUT / f"{engine_name}-research-{width}x{height}.png"))
                    page.locator(f'.lab-tabs-{nav} [data-one-target="work"]').click()
                    assert page.locator('[data-one-view="work"]').is_visible()
                    assert page.locator('.lab-system-card').count() == 4
                    page.locator(f'.lab-tabs-{nav} [data-one-target="activity"]').click()
                    assert page.locator('[data-one-view="activity"]').is_visible()
                    page.locator(f'.lab-tabs-{nav} [data-one-target="contact"]').click()
                    assert page.locator('[data-one-view="contact"]').is_visible()
                    assert page.locator('a[href="mailto:hello@devonakins.com"]').count() >= 1
                    if width > 760:
                        page.locator('.lab-tabs-desktop [data-one-target="home"]').click()
                        toggle = page.locator('[data-lab-motion]')
                        assert toggle.is_visible()
                        toggle.click()
                        assert toggle.get_attribute('aria-pressed') == "false"
                    if width == 375:
                        assert page.locator('[data-lab-motion]').is_disabled()
                    context.close()

                context = browser.new_context(viewport={"width": 390, "height": 844},
                                              java_script_enabled=False)
                page = context.new_page()
                page.goto(BASE, wait_until="domcontentloaded")
                assert page.locator('.lab-intro h1').is_visible()
                assert page.locator('noscript .lab-nojs a[href="/work/"]').count() == 1
                page.screenshot(path=str(OUT / f"{engine_name}-nojs-390x844.png"))
                context.close()
            finally:
                browser.close()
    print("Laboratory candidate Chromium/WebKit: 7 viewports, six sections, analytic controls, reduced-motion, no-JS passed.")
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
