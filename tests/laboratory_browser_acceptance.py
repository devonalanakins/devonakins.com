"""Independent portfolio laboratory: verified responsive and functional review."""
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
    for _ in range(100):
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except Exception:
            if server.poll() is not None:
                raise AssertionError("Preview exited before acceptance")
            time.sleep(.2)
    else:
        raise AssertionError("Preview was not ready")

    with sync_playwright() as pw:
        for engine_name in ("chromium", "webkit"):
            browser = getattr(pw, engine_name).launch()
            try:
                sizes = (
                    (1440, 900), (1024, 768), (768, 1024),
                    (390, 844), (375, 667), (320, 568), (1920, 1080)
                )
                for width, height in sizes:
                    context = browser.new_context(
                        viewport={"width": width, "height": height},
                        reduced_motion="reduce" if width == 375 else "no-preference",
                    )
                    page = context.new_page()
                    page.goto(BASE, wait_until="domcontentloaded")
                    heading = page.locator(".lab-portfolio-hero h1")
                    heading.wait_for(state="visible", timeout=15000)
                    assert page.title() == "Devon Alan Akins — Software, Systems & Research"
                    assert "Devon Alan" in heading.inner_text()
                    assert "Akins" in heading.inner_text()
                    assert page.locator(".lab-portfolio-project").count() == 4
                    assert page.locator(".lab-signal-tile").count() == 4
                    assert page.locator('[data-public-github-feed]').count() == 2
                    assert page.locator('[data-public-work]').count() == 1
                    assert page.locator('[data-public-spotify]').count() == 1
                    assert page.locator('[data-public-threads]').count() == 2
                    assert page.locator('[data-public-gpt]').count() == 0
                    assert page.locator('[href="/gpt/"]').count() == 0
                    assert page.locator('[data-one-view]').count() == 6
                    assert page.locator('[data-one-view="home"]').is_visible()
                    assert page.locator('[data-one-view="work"]').is_hidden()
                    assert "Nonclinical" in page.locator(".lab-portfolio-project").first.inner_text()
                    desktop = page.locator(".lab-header .lab-tabs-desktop")
                    mobile = page.locator("body > .lab-tabs-mobile")
                    if width <= 760:
                        assert desktop.is_hidden(), (engine_name, width, "duplicate desktop nav")
                        assert mobile.is_visible(), (engine_name, width, "missing mobile nav")
                        bar = mobile.bounding_box()
                        assert bar and bar["height"] <= 67 and bar["y"] >= height - 75, (
                            engine_name, width, bar)
                        tabs = mobile.locator("[data-one-target]")
                        assert tabs.count() == 6
                        rows = [tabs.nth(i).bounding_box()["y"] for i in range(6)]
                        assert max(rows)-min(rows) < 12, (engine_name, width, rows)
                        for i in range(6):
                            rect = tabs.nth(i).bounding_box()
                            assert rect and rect["x"] >= -1 and rect["x"]+rect["width"] <= width+1
                        behavior = page.locator('[data-one-view="home"]').evaluate(
                            """el => ({overflow:getComputedStyle(el).overflowY, visible:el.clientHeight, full:el.scrollHeight})""")
                        assert behavior["overflow"] in ("auto","scroll"),(engine_name,width,behavior)
                        assert behavior["full"]>behavior["visible"],(engine_name,width,behavior)
                    else:
                        assert desktop.is_visible(), (engine_name, width)
                        assert mobile.is_hidden(), (engine_name, width)
                    geo = page.evaluate("""() => {
                        const h=document.querySelector('.lab-portfolio-hero h1').getBoundingClientRect();
                        return {width:document.documentElement.scrollWidth,view:innerWidth,
                                left:h.left,right:h.right,height:h.height};
                    }""")
                    assert geo["width"] <= geo["view"]+2,(engine_name,width,geo)
                    assert geo["left"]>=-2 and geo["right"]<=width+2,(engine_name,width,geo)
                    assert geo["height"]>35
                    page.wait_for_timeout(300)
                    page.screenshot(path=str(OUT / f"{engine_name}-portfolio-{width}x{height}.png"))
                    if width <= 760:
                        page.locator(".lab-portfolio-signals").scroll_into_view_if_needed(timeout=8000)
                        assert page.locator(".lab-portfolio-signals").is_visible()
                        page.screenshot(path=str(OUT / f"{engine_name}-portfolio-feeds-{width}x{height}.png"))
                        page.locator(".lab-portfolio-hero").scroll_into_view_if_needed(timeout=8000)
                    nav = "mobile" if width <= 760 else "desktop"
                    page.locator(f'.lab-tabs-{nav} [data-one-target="experience"]').click()
                    assert page.locator('[data-one-view="experience"]').is_visible()
                    assert page.locator('[data-one-view="home"]').is_hidden()
                    assert page.url.endswith("#experience")
                    assert page.locator(f'.lab-tabs-{nav} [data-one-target="experience"]').get_attribute("aria-selected") == "true"
                    path = page.locator('[data-lab-curve="interactive"]')
                    before = path.get_attribute("d")
                    page.locator('[data-lab-axis="a"]').evaluate("""el => {
                        el.value = '5';
                        el.dispatchEvent(new Event('input',{bubbles:true}));
                    }""")
                    after = path.get_attribute("d")
                    assert after != before
                    assert "a = 5" in page.locator('[data-lab-model-caption]').inner_text()
                    if width in (1440,390):
                        page.screenshot(path=str(OUT / f"{engine_name}-research-{width}x{height}.png"))
                    page.locator(f'.lab-tabs-{nav} [data-one-target="work"]').click()
                    assert page.locator('[data-one-view="work"]').is_visible()
                    assert page.locator(".lab-system-card").count() == 4
                    if width in (1440,390):
                        page.screenshot(path=str(OUT / f"{engine_name}-work-{width}x{height}.png"))
                    page.locator(f'.lab-tabs-{nav} [data-one-target="activity"]').click()
                    assert page.locator('[data-one-view="activity"]').is_visible()
                    assert page.locator(".lab-evidence-guide").count() == 1
                    assert page.locator(".lab-activity [data-public-threads]").count() == 1
                    if width in (1440,390):
                        page.screenshot(path=str(OUT / f"{engine_name}-activity-{width}x{height}.png"))
                    page.locator(f'.lab-tabs-{nav} [data-one-target="writing"]').click()
                    assert page.locator('[data-one-view="writing"]').is_visible()
                    page.locator(f'.lab-tabs-{nav} [data-one-target="contact"]').click()
                    assert page.locator('[data-one-view="contact"]').is_visible()
                    assert page.locator('a[href="mailto:hello@devonakins.com"]').count()>=1
                    if width>760:
                        page.locator('.lab-tabs-desktop [data-one-target="home"]').click()
                        motion = page.locator('[data-lab-motion]')
                        if width>=1200:
                            assert motion.is_visible()
                            motion.click()
                            assert motion.get_attribute("aria-pressed")=="false"
                        else:
                            assert not motion.is_visible()
                    if width==375:
                        assert page.locator("[data-lab-motion]").is_disabled()
                    context.close()
                context=browser.new_context(
                    viewport={"width":390,"height":844}, java_script_enabled=False)
                page=context.new_page()
                page.goto(BASE,wait_until="domcontentloaded")
                assert page.locator(".lab-portfolio-hero h1").is_visible()
                assert page.locator('noscript .lab-nojs a[href="/work/"]').count()==1
                page.screenshot(path=str(OUT / f"{engine_name}-nojs-390x844.png"))
                context.close()
            finally:
                browser.close()
    print("Portfolio candidate: Chromium/WebKit seven viewports, six sections, sourced feeds, no-GPT, native research interaction, no-JS passed.")
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
