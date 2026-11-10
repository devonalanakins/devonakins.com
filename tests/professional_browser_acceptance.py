"""Chromium/WebKit desktop and phone acceptance for opt-in professional candidate."""
from pathlib import Path
import subprocess
import time
import urllib.request
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4173"
OUT = Path("browser-qa/professional")
OUT.mkdir(parents=True, exist_ok=True)

process = subprocess.Popen(
    ["./node_modules/.bin/vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
)
try:
    for attempt in range(50):
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except Exception:
            if process.poll() is not None:
                raise RuntimeError("Vite preview terminated early")
            time.sleep(.25)
    else:
        raise RuntimeError("Preview server unavailable")

    with sync_playwright() as playwright:
        for engine in ("chromium", "webkit"):
            browser = getattr(playwright, engine).launch()
            for width, height, device in ((1440, 900, "desktop"), (390, 844, "mobile")):
                page = browser.new_page(
                    viewport={"width":width,"height":height},
                    device_scale_factor=1,
                    reduced_motion="reduce",
                    is_mobile=device=="mobile",
                    has_touch=device=="mobile",
                )
                errors = []
                page.on("pageerror", lambda exc: errors.append(str(exc)))
                response = page.goto(BASE+"/", wait_until="domcontentloaded")
                assert response.status==200, (engine,device,"home")
                assert page.locator("h1").count()==1, (engine,device,"one h1")
                assert "I build the systems" in page.locator("h1").inner_text()
                assert page.locator("main").count()==1
                assert page.locator(".p-home-portrait img").is_visible()
                assert page.locator(".p-home-bottom [data-public-github-feed]").count()==1
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (engine,device,"horizontal overflow")
                if device=="mobile":
                    menu=page.get_by_role("button",name="Open menu")
                    assert menu.is_visible()
                    menu.click()
                    assert page.get_by_role("navigation",name="Mobile navigation").is_visible()
                    page.get_by_role("navigation",name="Mobile navigation").get_by_role("link",name="Experience").click()
                    assert page.url.endswith("/experience/")
                else:
                    page.get_by_role("navigation",name="Primary").get_by_role("link",name="Experience").click()
                    assert page.url.endswith("/experience/")
                assert "Experience" in page.locator("h1").inner_text()
                assert page.get_by_text("Associate of Arts degree").count()>0
                for path in ("/work/","/writing/","/about/","/contact/","/activity/"):
                    r=page.goto(BASE+path,wait_until="domcontentloaded")
                    assert r.status==200,(engine,device,path)
                    assert page.locator("main h1").count()==1,(engine,device,path)
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (engine,device,path,"overflow")
                assert page.locator("[data-public-github-feed]").count()==1
                assert page.get_by_role("button",name="Pull requests").count()==1
                page.get_by_role("button",name="Pull requests").click()
                assert page.get_by_role("button",name="Pull requests").get_attribute("aria-pressed")=="true"
                page.goto(BASE+"/",wait_until="domcontentloaded")
                page.screenshot(path=str(OUT/f"{engine}-{device}-home.png"),full_page=True)
                assert not errors,(engine,device,errors)
                page.close()
            browser.close()
    print("Professional candidate browser acceptance: Chromium/WebKit, 1440px and 390px, routes/navigation/activity filters, no overflow or page exceptions.")
finally:
    process.terminate()
    try:
        process.wait(timeout=4)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
