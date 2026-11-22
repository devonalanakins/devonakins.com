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
                for width,height in ((320,760),(390,844),(768,1024),(1440,900)):
                    context=browser.new_context(viewport={"width":width,"height":height},reduced_motion="reduce",ignore_https_errors=LOCAL_TLS)
                    page=context.new_page()
                    # This is a static Vite preview, not the deployed Worker API.
                    # Drive a deterministic prelaunch response and verify its client state.
                    page.route("**/api/creator/live", lambda route: route.fulfill(
                        status=200, content_type="application/json",
                        body='{"state":"prelaunch"}'
                    ))
                    errors=[]
                    page.on("pageerror",lambda error:errors.append(str(error)))
                    for path in ("/watch/","/podcast/","/courses/","/courses/man-of-the-house/start/","/setup/","/live/","/about/"):
                        response=page.goto(BASE+path,wait_until="networkidle")
                        assert response and response.status==200,(engine,width,path,"unavailable")
                        assert page.locator("main#pc-main").is_visible()
                        assert page.locator(".pc-skip").count()==1
                        assert page.locator('.pc-header a[aria-current="page"]').count()==1
                        assert page.locator(".pc-nav").is_visible()
                        assert page.locator(".pc-nav a").count()==6
                        assert page.locator(".pc-context-nav").is_visible()
                        assert page.locator(".pc-context-nav a").count()==6
                        if width==320:
                            page.locator('.pc-nav a[href="/about/"]').focus()
                            assert page.evaluate("document.activeElement.getAttribute('href')")=="/about/"
                            page.locator('.pc-context-nav a[href="/contact/"]').focus()
                            assert page.evaluate("document.activeElement.getAttribute('href')")=="/contact/"
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
                            assert page.locator(".pc-course-feature h2").inner_text().strip()=="Man of the House."
                            assert page.locator('.pc-course-feature a[href="/courses/man-of-the-house/start/"]').count()==1
                            assert "No account or payment is needed" in page.locator(".pc-course-feature").inner_text()
                            assert page.locator("main").inner_text().index("Man of the House.") < page.locator("main").inner_text().index("Mathematical physics")
                            assert page.locator('a[href="/podcast/"]').count()>=2
                            assert "No courses are available for enrollment" in page.locator("main").inner_text()
                            assert page.locator("audio,video,iframe,form").count()==0
                        elif path=="/courses/man-of-the-house/start/":
                            assert page.locator(".pc-lesson").is_visible()
                            assert "Start with a" in page.locator("h1").inner_text()
                            assert page.locator(".pc-lesson-reading section").count()==7
                            assert page.locator(".pc-lesson-toc a").count()==6
                            assert page.locator('a[href="/courses/"][aria-current="page"]').count()==1
                            assert page.locator("audio,video,iframe,form").count()==0
                            assert "no account tracking or saved course progress" in page.locator("main").inner_text()
                            if width==320:
                                page.locator('.pc-lesson-toc a[href="#lesson-finish"]').focus()
                                assert page.evaluate("document.activeElement.getAttribute('href')")=="#lesson-finish"
                        elif path=="/about/":
                            assert page.locator(".pc-about").is_visible()
                            assert "The person behind" in page.locator("h1").inner_text()
                            assert page.locator(".pc-about-grid section").count()==4
                            assert page.locator(".pc-about-principles li").count()==4
                            assert page.locator('a[href="/about/"][aria-current="page"]').count()==1
                            assert page.locator("audio,video,iframe,form").count()==0
                            assert "clinical judgments remain with licensed professionals" in page.locator("main").inner_text()
                        elif path=="/live/":
                            assert page.locator("[data-mobile-live]").count()==1
                            assert page.locator("[data-live-status]").count()==1
                            assert page.locator("[data-live-status]").inner_text().strip()=="NOT BROADCASTING"
                            assert "No broadcast right now." in page.locator("main").inner_text()
                            assert page.locator("[data-live-player] iframe").count()==0
                            assert page.locator("iframe, video, audio").count()==0
                            assert page.locator("a[href=\"/podcast/\"]").count()>=1
                            assert page.locator('.pc-live a[href="/watch/"]').count()>=2
                        else:
                            assert page.locator(".pc-product").count()==10
                            assert page.locator(".pc-product-status-future").count()==1
                            assert page.locator(".pc-jump").is_visible()
                            assert page.locator(".pc-product-status-considering").count()==7
                            assert page.locator(".pc-product-status-owned").count()==2
                            assert page.locator('.pc-product[data-gear-id="existing-iphone"]').count()==1
                            assert page.locator('.pc-product[data-gear-id="existing-sony-headset"]').count()==1
                            assert page.locator('.pc-product[data-gear-status="owned"] a').count()==0
                            assert "model not independently checked" in page.locator('.pc-product[data-gear-id="existing-sony-headset"]').inner_text().lower()
                            assert page.locator(".pc-product a[target='_blank']").count()>=8
                        name=path.strip("/").replace("/","-")
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
                    if width in (320, 390, 1440):
                        page.goto(BASE+"/", wait_until="networkidle")
                        assert page.locator(".lab-site-nav a").count()==6
                        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
                        # Native cross-document links may commit navigation after
                        # the click resolves in WebKit. Wait for the real URL and
                        # loaded destination instead of sampling a transient URL.
                        watch_link=page.locator('.lab-site-nav a[href="/watch/"]')
                        assert watch_link.get_attribute("href")=="/watch/"
                        watch_link.click()
                        page.wait_for_url(BASE+"/watch/", wait_until="networkidle", timeout=15000)
                        assert page.locator("main#pc-main").is_visible()
                        assert page.locator("h1").inner_text().strip()=="Watch."
                        assert page.locator('link[rel="canonical"]').get_attribute("href")=="https://devonakins.com/watch/"
                        page.goto(BASE+"/work/", wait_until="networkidle")
                        assert page.locator('.lab-site-nav a[href="/work/"][aria-current="page"]').count()==1
                        page.goto(BASE+"/fieldnotes/", wait_until="networkidle")
                        assert page.locator('.lab-site-nav a[href="/fieldnotes/"][aria-current="page"]').count()==1
                    context.close()
            finally:
                browser.close()
    print("Creator pages passed Chromium/WebKit at 320, 390, 768, and 1440 px in both color modes.")
finally:
    if server:
        server.terminate()
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired: server.kill()
