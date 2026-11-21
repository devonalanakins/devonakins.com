"""Real Chromium and WebKit acceptance for the personal creator pages."""
import os
import subprocess
import ssl
from urllib.parse import urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from cinematic_browser_helpers import wait_for_local_preview

BASE=os.environ.get("CREATOR_TEST_ORIGIN","http://127.0.0.1:4184").rstrip("/")
LOCAL_TLS=urlparse(BASE).scheme=="https" and urlparse(BASE).hostname=="127.0.0.1"
TLS_CONTEXT=ssl._create_unverified_context() if LOCAL_TLS else None
OUT=Path("browser-qa/creator")
OUT.mkdir(parents=True,exist_ok=True)
server=None if os.environ.get("CREATOR_TEST_ORIGIN") else subprocess.Popen(
    ["./node_modules/.bin/vite","preview","--host","127.0.0.1","--port","4184","--strictPort"],
    stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT
)
try:
    wait_for_local_preview(BASE,server,TLS_CONTEXT)
    with sync_playwright() as pw:
        for engine in ("chromium","webkit"):
            browser=getattr(pw,engine).launch()
            try:
                for width,height in ((390,844),(768,1024),(1440,900)):
                    context=browser.new_context(viewport={"width":width,"height":height},reduced_motion="reduce",ignore_https_errors=LOCAL_TLS)
                    page=context.new_page()
                    errors=[]
                    page.on("pageerror",lambda error:errors.append(str(error)))
                    for path in ("/watch/","/podcast/","/courses/","/setup/","/live/"):
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
                        if path=="/watch/":
                            assert page.locator("h1").inner_text().strip()=="Watch."
                            assert page.locator(".pc-watch-empty").is_visible()
                            assert "No videos published yet" in page.locator("main").inner_text()
                            assert page.locator("audio,video,iframe").count()==0
                        elif path=="/podcast/":
                            assert " ".join(page.locator("h1").inner_text().split())=="Devon Alan Akins"
                            if page.locator(".pc-state").count():
                                assert page.locator(".pc-state").inner_text()=="No episodes published yet"
                            assert page.locator('a[href="/setup/"]').count()>=2
                            assert page.locator("audio,video,iframe").count()==0
                        elif path=="/courses/":
                            assert page.locator("h1").inner_text().strip()=="Courses."
                            assert page.locator(".pc-course-steps article").count()==3
                            assert page.locator('a[href="/podcast/"]').count()>=2
                            assert "No courses are available for enrollment" in page.locator("main").inner_text()
                            assert page.locator("audio,video,iframe,form").count()==0
                        elif path=="/live/":
                            assert page.locator("[data-mobile-live]").count()==1
                            assert page.locator("[data-live-status]").count()==1
                            assert "No broadcast right now." in page.locator("main").inner_text()
                            assert page.locator("[data-live-player] iframe").count()==0
                            assert page.locator("iframe, video, audio").count()==0
                            assert page.locator("a[href=\"/podcast/\"]").count()>=1
                        else:
                            assert page.locator(".pc-product").count()==8
                            assert page.locator(".pc-product-status-future").count()==1
                            assert page.locator(".pc-jump").is_visible()
                            assert page.locator(".pc-product-status-considering").count()==7
                            assert page.locator(".pc-product a[target='_blank']").count()>=8
                        name=path.strip("/")
                        page.screenshot(path=str(OUT/f"{engine}-{name}-{width}-light.png"),full_page=True)
                        if width==390:
                            page.evaluate(Path("node_modules/axe-core/axe.min.js").read_text())
                            audit="async()=> (await axe.run()).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)"
                            assert not (violations:=page.evaluate(audit)),(engine,width,path,violations)
                            page.locator(".pc-skip").focus()
                            page.keyboard.press("Enter")
                            assert page.evaluate("document.activeElement.id")=="pc-main"
                        theme=page.locator("[data-lab-theme-select]")
                        theme.select_option("dark")
                        page.evaluate("scrollTo(0,0)")
                        assert page.evaluate("getComputedStyle(document.documentElement).backgroundColor")=="rgb(12, 17, 26)",(
                            engine,width,path,"dark palette"
                        )
                        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),(engine,width,path,"dark overflow")
                        page.screenshot(path=str(OUT/f"{engine}-{name}-{width}-dark.png"),full_page=True)
                        if width==390:
                            assert not (violations:=page.evaluate(audit)),(engine,width,path,"dark",violations)
                            page.reload(wait_until="networkidle")
                            assert theme.input_value()=="dark",(engine,path,"dark preference lost on reload")
                        theme.select_option("system")
                        assert page.evaluate("document.documentElement.dataset.theme")=="light"
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
