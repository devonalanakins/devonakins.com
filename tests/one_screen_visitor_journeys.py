"""Task-based visitor checks for the compiled one-screen candidate.

These are scripted usability proxies, NOT a claim that a nonexpert human has
reviewed the site or that provider data is available in production.
"""
import re
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4175"
OUT = Path("browser-qa/one-screen")
OUT.mkdir(parents=True, exist_ok=True)
process = subprocess.Popen(
    ["./node_modules/.bin/vite", "preview", "--host", "127.0.0.1",
     "--port", "4175", "--strictPort"],
    stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
)

try:
    for _ in range(70):
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except Exception:
            if process.poll() is not None:
                raise RuntimeError("Visitor-journey preview terminated")
            time.sleep(.25)
    else:
        raise RuntimeError("Visitor-journey preview unavailable")

    with sync_playwright() as pw:
        for engine in ("chromium", "webkit"):
            browser = getattr(pw, engine).launch()
            for width, height in ((1440, 900), (390, 844)):
                mobile = width <= 760
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    reduced_motion="reduce", is_mobile=mobile, has_touch=mobile,
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda exc: errors.append(str(exc)))
                response = page.goto(BASE + "/", wait_until="domcontentloaded")
                assert response.status == 200, (engine, width, "home response")
                assert page.get_by_role("main").count() == 1
                assert page.locator('[data-one-view="home"] h1').is_visible()
                tabs = page.locator(".one-tabs-mobile" if mobile else ".one-tabs-desktop")
                assert tabs.get_by_role("tab", name="Profile").get_attribute("aria-selected") == "true"

                # Task 1: A new connection finds concrete work from the landing screen.
                page.get_by_role("button", name=re.compile("Explore my work", re.I)).click()
                assert page.locator('[data-one-view="work"]').is_visible()
                assert page.locator(".one-projects .one-project").count() == 3
                assert page.locator(".one-project-operations a").get_attribute("href") == "/work/operations/"
                assert page.locator(".one-project-systems a").get_attribute("href") == "/work/devonstation/"
                assert page.locator(".one-project-site a").get_attribute("href") == "/work/"
                assert "IN DEVELOPMENT" in page.locator(".one-project-systems").inner_text()
                assert "LIVE WEBSITE" in page.locator(".one-project-site").inner_text()
                assert page.locator(".one-project-operations a").is_visible()
                page.screenshot(path=str(OUT / f"{engine}-{width}x{height}-visitor-work.png"))

                # Task 2: The process must be understandable and its quality gates usable.
                tabs.get_by_role("tab", name="Profile").click()
                page.get_by_role("button", name=re.compile("See my process", re.I)).click()
                assert page.locator('[data-one-view="experience"]').is_visible()
                assert "software developer" in page.locator(".career-intro").inner_text().lower()
                assert page.locator(".one-method-path li").count() == 6
                assert page.locator("[data-method-select]").count() == 4
                target = page.locator('[data-method-select="engineering"]')
                target.click()
                assert target.get_attribute("aria-pressed") == "true"
                assert page.locator('[data-method-panel="engineering"]').is_visible()
                assert "under inspection" in page.locator(
                    '[data-method-panel="engineering"]').inner_text().lower()
                target.focus()
                page.keyboard.press("ArrowRight")
                assert page.locator('[data-method-select="stewardship"]').get_attribute(
                    "aria-pressed") == "true"
                assert page.locator('[data-method-panel="stewardship"]').is_visible()
                page.keyboard.press("Home")
                assert page.locator('[data-method-select="product"]').get_attribute(
                    "aria-pressed") == "true"
                assert page.locator(".career-intro a").get_attribute("href") == "/experience/"

                # Task 3: Public source status is explicit; history is not "coding now".
                tabs.get_by_role("tab", name="Activity").click()
                assert page.locator('[data-one-view="activity"]').is_visible()
                assert "timestamped" in page.locator(
                    '[data-one-view="activity"]').inner_text().lower()
                disclosure = page.locator(
                    '[data-one-view="activity"] .one-feed-disclosure')
                assert disclosure.is_visible()
                assert "not a claim of coding now" in disclosure.inner_text().lower()
                button = page.locator(
                    '[data-one-view="activity"] [data-github-filter="push"]')
                button.click()
                assert button.get_attribute("aria-pressed") == "true"
                assert page.locator(
                    '[data-one-view="activity"] [data-github-refresh]').is_visible()

                # Task 4: A visitor can discover a direct, working contact route.
                tabs.get_by_role("tab", name="Contact").click()
                assert page.locator('[data-one-view="contact"]').is_visible()
                email = page.locator('[data-one-view="contact"] .one-email')
                assert email.is_visible()
                assert email.get_attribute("href") == "mailto:devon@anevum.com"
                assert page.locator(
                    '[data-one-view="contact"] a[href="/contact/"]').is_visible()
                page.screenshot(path=str(
                    OUT / f"{engine}-{width}x{height}-visitor-contact.png"))

                # No hidden document overflow or runtime failure after the journeys.
                dimensions = page.evaluate("""() => ({
                    width: document.documentElement.scrollWidth,
                    height: document.documentElement.scrollHeight
                })""")
                assert dimensions["width"] <= width + 2, (engine, width, "horizontal overflow")
                assert dimensions["height"] <= height + 2, (engine, width, "vertical overflow")
                assert not errors, (engine, width, "browser errors", errors)
                context.close()

            # Task 5: A direct public page remains readable without JavaScript.
            context = browser.new_context(
                viewport={"width": 390, "height": 844},
                java_script_enabled=False, reduced_motion="reduce",
            )
            page = context.new_page()
            for route, expected in (
                ("/experience/", "Experience"),
                ("/work/operations/", "Business operations"),
                ("/contact/", "useful work"),
            ):
                response = page.goto(BASE + route, wait_until="domcontentloaded")
                assert response.status == 200, (engine, route, "direct route")
                assert expected.lower() in page.locator("h1").inner_text().lower(), (
                    engine, route, "human-readable deep route")
                assert page.locator("main").count() == 1, (engine, route, "main landmark")
            context.close()
            browser.close()
finally:
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
