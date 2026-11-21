"""Real Chromium and WebKit acceptance for the personal creator pages."""
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from cinematic_browser_helpers import wait_for_local_preview

BASE=os.environ.get("CREATOR_TEST_ORIGIN","http://127.0.0.1:4184").rstrip("/")
OUT=Path("browser-qa/creator")
OUT.mkdir(parents=True,exist_ok=True)
server=None if os.environ.get("CREATOR_TEST_ORIGIN") else subprocess.Popen(
    ["./node_modules/.bin/vite","preview","--host","127.0.0.1","--port","4184","--strictPort"],
    stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT
)
try:
    wait_for_local_preview(BASE,server)
    with sync_playwright() as pw:
        for engine in ("chromium","webkit"):
            browser=getattr(pw,engine).launch()
            try:
                for width,height in ((390,844),(768,1024),(1440,900)):
                    context=browser.new_context(viewport={"width":width,"height":height},reduced_motion="reduce")
                    page=context.new_page()
                    errors=[]
                    page.on("pageerror",lambda error:errors.append(str(error)))
                    for path in ("/podcast/","/setup/"):
                        response=page.goto(BASE+path,wait_until="networkidle")
                        assert response and response.status==200,(engine,width,path,"unavailable")
                        assert page.locator("main#pc-main").is_visible()
                        assert page.locator(".pc-skip").count()==1
                        assert page.locator('.pc-nav a[aria-current="page"]').count()==1
                        assert page.locator(".pc-nav").is_visible()
                        assert page.locator("h1").count()==1
                        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),(
                            engine,width,path,"horizontal overflow",page.evaluate("document.documentElement.scrollWidth")
                        )
                        assert page.evaluate("getComputedStyle(document.body).fontFamily.includes('Arial')")
                        assert page.evaluate("getComputedStyle(document.documentElement).backgroundColor")=="rgb(243, 241, 233)",(
                            engine,width,path,"light palette"
                        )
                        if path=="/podcast/":
                            assert "The Mark" in page.locator("h1").inner_text()
                            assert "NO EPISODES RELEASED" in page.locator(".pc-state").inner_text()
                            assert page.locator('a[href="/setup/"]').count()>=2
                            assert page.locator("audio,video,iframe").count()==0
                        else:
                            assert page.locator(".pc-product").count()==8
                            assert page.locator(".pc-product-status-future").count()==1
                            assert page.locator(".pc-facts").is_visible()
                            assert page.locator(".pc-product a[target='_blank']").count()==8
                        name=path.strip("/")
                        page.screenshot(path=str(OUT/f"{engine}-{name}-{width}-light.png"),full_page=True)
                        page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
                        assert page.evaluate("getComputedStyle(document.documentElement).backgroundColor")=="rgb(12, 17, 26)",(
                            engine,width,path,"dark palette"
                        )
                        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),(engine,width,path,"dark overflow")
                        page.screenshot(path=str(OUT/f"{engine}-{name}-{width}-dark.png"),full_page=True)
                        assert not errors,(engine,width,path,errors)
                    context.close()
            finally:
                browser.close()
    print("Creator pages passed Chromium/WebKit at 390, 768, and 1440 px in both color modes.")
finally:
    if server:
        server.terminate()
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired: server.kill()
