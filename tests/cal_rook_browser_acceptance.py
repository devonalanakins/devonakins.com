"""Review-only actual candidate build. No deployment; API responses are synthetic."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from cinematic_browser_helpers import wait_for_local_preview
BASE="http://127.0.0.1:4184"
OUT=Path("browser-qa/cal-rook")
OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(["./node_modules/.bin/vite","preview","--host","127.0.0.1","--port","4184","--strictPort"],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
routes=("/", "/work/", "/work/merit/", "/fieldnotes/", "/courses/", "/watch/", "/podcast/", "/live/", "/about/", "/contact/", "/research/", "/systems/", "/activity/", "/setup/")
issues=[]
try:
    wait_for_local_preview(BASE,server,None)
    with sync_playwright() as pw:
        for engine in ("chromium","webkit"):
            browser=getattr(pw,engine).launch()
            try:
                for width,height in ((320,760),(390,844),(1440,1000)):
                    for scheme in ("light","dark"):
                        ctx=browser.new_context(viewport={"width":width,"height":height},color_scheme=scheme,reduced_motion="reduce")
                        page=ctx.new_page()
                        page.route("**/api/creator/live",lambda route: route.fulfill(status=200,content_type="application/json",body='{"state":"prelaunch"}'))
                        errors=[]
                        page.on("pageerror",lambda error:errors.append(str(error)))
                        for path in routes:
                            res=page.goto(BASE+path,wait_until="domcontentloaded")
                            assert res and res.status==200,(engine,width,scheme,path,"route unavailable")
                            page.locator("main").wait_for(state="visible")
                            assert page.locator("html[data-cal-rook]").count()==1,path
                            assert page.locator("html").get_attribute("data-theme")==scheme,path
                            assert page.locator(".site-brand strong").inner_text()=="Devon Alan Akins"
                            assert page.locator(".site-primary-nav a").count()==6
                            assert page.locator(".site-secondary-nav a").count()==6
                            assert page.locator('link[rel="canonical"]').get_attribute("href").startswith("https://devonakins.com/")
                            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1"),(engine,width,scheme,path,"overflow")
                            assert page.locator(".site-brand svg.rook-mark").is_visible()
                            if path=="/":
                                assert page.locator("h1.da-name").is_visible()
                                assert page.locator("h1.da-name").inner_text()=="Devon Alan Akins"
                                assert page.locator(".rook-guide").is_visible()
                                page.locator(".rook-portrait img").evaluate("im => im.decode()")
                                assert page.locator(".rook-portrait img").evaluate("im => im.naturalWidth") == 224
                                assert page.locator(".rook-feature").is_visible()
                                assert page.get_by_role("link",name="See what I’ve built").is_visible()
                                assert page.get_by_role("link",name="Read the field notes").is_visible()
                                page.keyboard.press("Tab")
                                assert page.locator(":focus-visible").count() >= 1
                                page.screenshot(path=str(OUT/f"{engine}-{width}-{scheme}-home.png"),full_page=True,animations="disabled")
                                page.add_script_tag(path="node_modules/axe-core/axe.min.js")
                                result=page.evaluate("async () => (await axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations")
                                issues.extend({"engine":engine,"width":width,"scheme":scheme,"path":path,"id":v["id"],"impact":v["impact"],"nodes":[n["target"] for n in v["nodes"]]} for v in result)
                                page.get_by_role("link",name="Read the field notes").click()
                                page.wait_for_url("**/fieldnotes/")
                            if path=="/about/": assert "not a chatbot or a separate person" in page.locator("main").inner_text()
                            if path=="/live/":
                                assert page.locator(".pc-live").is_visible()
                                assert page.locator("main iframe").count()==0
                            if path in ("/work/","/fieldnotes/","/courses/","/live/","/about/") and width in (390,1440):
                                page.screenshot(path=str(OUT/f"{engine}-{width}-{scheme}-{path.strip('/')}.png"),full_page=True,animations="disabled")
                        assert not errors,(engine,width,scheme,errors)
                        ctx.close()
            finally:
                browser.close()
finally:
    (OUT/"axe-findings.json").write_text(json.dumps(issues,indent=2))
    server.terminate()
    server.wait(timeout=10)
assert not issues, "Accessibility findings saved in browser-qa/cal-rook/axe-findings.json"
print("Cal Rook built-candidate browser checks passed; no production or real broadcast tested.")
