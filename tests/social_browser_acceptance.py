"""Browser acceptance for first-party social rail and consented Threads preview."""
import json
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4175"
OUT = Path("browser-qa/one-screen/social")
OUT.mkdir(parents=True, exist_ok=True)
process = subprocess.Popen(
    ["./node_modules/.bin/vite", "preview", "--host", "127.0.0.1", "--port", "4175", "--strictPort"],
    stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
)
try:
    for _ in range(70):
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except Exception:
            if process.poll() is not None:
                raise RuntimeError("Social candidate preview terminated")
            time.sleep(.25)
    else:
        raise RuntimeError("Social candidate preview unavailable")

    with sync_playwright() as pw:
        for engine in ("chromium", "webkit"):
            browser = getattr(pw, engine).launch()
            for width, height in ((1440, 900), (390, 844), (320, 640)):
                mobile = width <= 760
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                    is_mobile=mobile, has_touch=mobile, reduced_motion="reduce",
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda exc: errors.append(str(exc)))
                mode = {"published": True, "text": "Public proof <script>alert(\'x\')</script> stays plain text.", "media": False}
                first_observation = datetime.now(timezone.utc)
                mode["checked_at"] = first_observation

                def activity_response(route):
                    now = datetime.now(timezone.utc)
                    iso = lambda dt: dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")
                    post = {
                        "href": "https://www.threads.com/@verified/post/ABCd1234",
                        "text": mode["text"],
                        "publishedAt": iso(first_observation - timedelta(minutes=12)),
                        "media": mode["media"],
                    }
                    feed = {"version": 4, "asOf": iso(now), "threads": {
                        "version": 1, "state": "connected" if mode["published"] else "hidden",
                        "checkedAt": iso(mode["checked_at"]), "posts": [post] if mode["published"] else [],
                    }}
                    route.fulfill(
                        status=200, content_type="application/json",
                        body=json.dumps(feed),
                    )

                page.route("**/api/activity/v4", activity_response)
                response = page.goto(BASE + "/", wait_until="domcontentloaded")
                assert response.status == 200, (engine, width, height, response.status)
                footer = page.locator("footer .one-social-channels--compact")
                assert footer.is_visible(), (engine, width, height, "social footer missing")
                assert footer.locator('a[href="https://github.com/devonalanakins"]').count() == 1
                assert footer.locator('a[href="https://www.instagram.com/devonalanakins/"]').count() == 1
                assert footer.locator('a[href="https://www.threads.com/@devonalanakins"]').count() == 1
                assert footer.locator('a[href="https://fb.com/devonalanakins"]').count() == 1
                for social_link in footer.locator("a.one-social-icon").all():
                    assert social_link.locator("svg path").count() == 1
                    assert social_link.get_attribute("aria-label")
                    assert social_link.inner_text().strip() == "", (
                        engine, width, height, "visible social labels should be brand marks"
                    )
                    assert social_link.bounding_box()["width"] >= 27
                home = page.locator(".studio-threads-inline")
                assert home.is_visible(), (engine,width,height,"homepage Threads preview absent")
                page.wait_for_function(
                    'document.querySelector(".studio-threads-inline").dataset.threadsConnected==="true"',
                    timeout=10000,
                )
                assert "<script>" in home.locator('[data-threads-summary]').inner_text()
                assert home.locator('[data-threads-link]').get_attribute("href") == (
                    "https://www.threads.com/@verified/post/ABCd1234"
                )
                dock=page.locator(".studio-social-dock")
                if height>470:
                    assert dock.is_visible(),(engine,width,height,"social profiles absent from home")
                assert dock.locator('a[href="https://www.threads.com/@devonalanakins"]').count()==1
                assert page.locator(".one-social-unverified").count()==0
                # Use the explicit full-feed action, or mobile Contact tab on
                # very short phones where the compact action is hidden by CSS.
                if width<=400 and height<=700:
                    page.locator('.one-tabs-mobile [data-one-target="contact"]').click()
                else:
                    home.locator('button[data-one-go="contact"]').click()
                assert page.locator('[data-one-view="contact"]').is_visible()
                assert page.locator('[data-one-view="home"]').is_hidden()
                panel = page.locator('.one-threads-panel')
                assert panel.is_visible(), (engine, width, height, "Threads panel not visible")
                page.wait_for_function(
                    'document.querySelector(".one-threads-panel").dataset.threadsConnected==="true"',
                    timeout=10000,
                )
                post = panel.locator('.one-threads-posts li')
                assert post.count() == 1, (engine, width, height, "public approved post")
                summary = panel.locator(".one-threads-description").inner_text()
                assert "1 approved public update" in summary, (engine, width, height, summary)
                assert "<script>" not in summary, "A full post must not duplicate in the preview summary"
                link = post.locator("a")
                assert link.get_attribute("href") == "https://www.threads.com/@verified/post/ABCd1234"
                assert link.get_attribute("rel") == "noopener noreferrer"
                assert link.get_attribute("referrerpolicy") == "no-referrer"
                assert "<script>" in link.inner_text(), "Post is text, never interpreted as HTML"
                assert panel.locator("script").count() == 0
                assert post.locator("time").get_attribute("datetime")
                assert page.locator(".one-social-unverified").count() == 0
                assert page.locator('.one-threads-profile[href="https://www.threads.com/@devonalanakins"]').count()==1
                bounds = page.evaluate("""() => {
                  const stage=document.querySelector('.one-stage').getBoundingClientRect();
                  const panel=document.querySelector('.one-threads-panel').getBoundingClientRect();
                  const summary=document.querySelector('.one-threads-description').getBoundingClientRect();
                  return {scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,
                    panelWidth:panel.width,panelHeight:panel.height,
                    inStage:panel.top>=stage.top-3&&panel.bottom<=stage.bottom+3&&
                      panel.left>=stage.left-3&&panel.right<=stage.right+3,
                    summaryVisible:summary.width>20&&summary.height>8};
                }""")
                assert bounds["scrollW"] <= width+2 and bounds["scrollH"] <= height+2, (
                    engine,width,height,"document overflow",bounds,
                )
                assert bounds["inStage"] and bounds["summaryVisible"] and bounds["panelHeight"]>75, (
                    engine,width,height,"Threads panel clipping",bounds,
                )
                # Edit content and media with an unchanged source timestamp and URL.
                # Refresh through the existing visibility path without reloading.
                mode["text"] = "Same source timestamp; updated public message."
                mode["media"] = True
                page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
                page.wait_for_function('''() =>
                    document.querySelector(".one-threads-posts a")?.textContent===
                    "Same source timestamp; updated public message."
                ''', timeout=10000)
                assert panel.locator(".one-threads-media").inner_text() == "Includes media"
                # A source heartbeat with unchanged posts must preserve the anchor
                # and keyboard focus, even though checkedAt has advanced.
                focused = page.evaluate("""() => {
                  const anchor = document.querySelector(".one-threads-posts a");
                  anchor.focus();
                  window.__threadFocus = anchor;
                  return document.activeElement === anchor;
                }""")
                assert focused, (engine, width, height, "post link could not focus")
                mode["checked_at"] = datetime.now(timezone.utc)
                with page.expect_response("**/api/activity/v4"):
                    page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
                page.wait_for_timeout(250)
                assert page.evaluate("""() => {
                  const anchor = document.querySelector(".one-threads-posts a");
                  return anchor === window.__threadFocus && document.activeElement === anchor;
                }"""), (engine, width, height, "source heartbeat replaced focused link")
                page.screenshot(path=str(OUT/f"{engine}-{width}x{height}-connected.png"), animations="disabled")
                # Revoke sharing while the panel is open. The old post must
                # disappear on the next public refresh without a page reload.
                mode["published"] = False
                with page.expect_response("**/api/activity/v4"):
                    page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
                page.wait_for_function(
                    'document.querySelector(".one-threads-panel").dataset.threadsConnected==="false"',
                    timeout=10000,
                )
                assert page.locator(".one-threads-posts li").count() == 0
                assert "SOURCE UNAVAILABLE" in page.locator(".one-threads-status").inner_text()
                assert home.get_attribute("data-threads-connected")=="false"
                assert home.locator('[data-threads-link]').get_attribute("href")==(
                    "https://www.threads.com/@devonalanakins"
                )
                assert "<script>" not in home.locator('[data-threads-summary]').inner_text()
                assert page.locator('a[href*="threads.com/@verified"]').count() == 0
                assert not errors, (engine,width,height,"JavaScript errors",errors)
                page.screenshot(path=str(OUT/f"{engine}-{width}x{height}-unavailable.png"), animations="disabled")
                context.close()
            browser.close()
finally:
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
