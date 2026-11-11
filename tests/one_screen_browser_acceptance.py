"""Single-viewport candidate acceptance: Chromium/WebKit, desktop and phone."""
import subprocess, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE="http://127.0.0.1:4174"
OUT=Path("browser-qa/one-screen")
OUT.mkdir(parents=True,exist_ok=True)
process=subprocess.Popen(["./node_modules/.bin/vite","preview","--host","127.0.0.1","--port","4174","--strictPort"],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
try:
    for _ in range(70):
        try:
            urllib.request.urlopen(BASE,timeout=1).close()
            break
        except Exception:
            if process.poll() is not None: raise RuntimeError("Preview process terminated")
            time.sleep(.25)
    else: raise RuntimeError("Candidate server unavailable")
    with sync_playwright() as pw:
        for engine in ("chromium","webkit"):
            browser=getattr(pw,engine).launch()
            for width,height in ((1440,900),(1024,768),(390,844),(320,640),(844,390)):
                mobile=width <= 844
                context=browser.new_context(viewport={"width":width,"height":height},device_scale_factor=1,reduced_motion="reduce",is_mobile=mobile,has_touch=mobile)
                page=context.new_page()
                errors=[]
                page.on("pageerror",lambda exc:errors.append(str(exc)))
                response=page.goto(BASE+"/",wait_until="domcontentloaded")
                assert response.status==200,(engine,width,height,response.status)
                assert page.locator('main#one-stage').count()==1
                assert page.locator(".one-portrait").count()==0,(engine,width,height,"portrait removed")
                assert page.locator('img[src*="headshot"]').count()==0,(engine,width,height,"no portrait resource")
                assert page.locator('[data-one-view]:visible').count()==1,(engine,width,height,"initial panel")
                assert page.locator('[data-public-github-feed]').count()==2
                assert page.locator('[data-public-spotify]').count()==1
                assert page.locator('[data-public-gpt]').count()==2
                dimensions=page.evaluate("""() => ({
                  doc:document.documentElement.scrollHeight,
                  width:document.documentElement.scrollWidth,
                  innerHeight:innerHeight,innerWidth:innerWidth,
                  body:document.body.scrollHeight,
                  stage:document.querySelector('.one-stage').getBoundingClientRect().height
                })""")
                assert dimensions["doc"] <= height+2,(engine,width,height,dimensions,"no vertical document scroll")
                assert dimensions["width"] <= width+2,(engine,width,height,dimensions,"no horizontal document scroll")
                expected_home = 1 if (width<=400 and height<=700) or (width>760 and height<=470) else 2 if width<=760 else 4
                expected_activity = 2 if (width<=400 and height<=700) or (width>760 and height<=470) else 4 if width<=760 else 6
                assert page.locator("#one-home-github").get_attribute("data-limit")==str(expected_home),(engine,width,height,"home capacity")
                assert page.locator("#one-activity-github").get_attribute("data-limit")==str(expected_activity),(engine,width,height,"activity capacity")
                # In compact view the public playback title and GPT value must
                # remain inside their actual tiles, not just the document.
                if width<=760 or height<=470:
                    assert page.evaluate("""() => {
                      return [...document.querySelectorAll(".one-signal-bottom .p-signal-card")].every(card => {
                        const child=card.querySelector("[data-spotify-title], [data-gpt-value]");
                        if(!child)return false;
                        const a=card.getBoundingClientRect(),b=child.getBoundingClientRect();
                        return b.top>=a.top-2 && b.bottom<=a.bottom+2;
                      });
                    }"""),(engine,width,height,"source title containment")
                # The page includes two differently sized tablists: choose visible tab.
                tabs=page.locator('.one-tabs-mobile [role="tablist"]' if width<=760 else '.one-tabs-desktop [role="tablist"]')
                for label,key in (("Experience","experience"),("Work","work"),("Activity","activity"),("Writing","writing"),("Contact","contact"),("Home","home")):
                    tabs.get_by_role("tab",name=label).click()
                    assert page.locator('[data-one-view="'+key+'"]').is_visible(),(engine,width,height,key)
                    assert page.locator('[data-one-view]:visible').count()==1,(engine,width,height,key)
                    # Each primary heading and case-card must stay inside the
                    # viewport across ALL six sections, not only the homepage.
                    outliers=page.evaluate("""name => {
                      const root=document.querySelector('[data-one-view="'+name+'"]');
                      const bounds=root.getBoundingClientRect();
                      return [...root.querySelectorAll('h1,.one-fact-stack article,.one-project,.one-activity-feed')]
                        .filter(el => {
                          const r=el.getBoundingClientRect();
                          return r.top<bounds.top-3 || r.bottom>bounds.bottom+3 ||
                            r.left<bounds.left-3 || r.right>bounds.right+3;
                        })
                        .map(el=>el.tagName+" "+el.className);
                    }""",key)
                    assert not outliers,(engine,width,height,key,"off-canvas content",outliers)
                    if key in ("work","experience","contact"):
                        page.screenshot(path=str(OUT/f"{engine}-{width}x{height}-{key}.png"))
                tabs.get_by_role("tab",name="Activity").click()
                page.screenshot(path=str(OUT/f"{engine}-{width}x{height}-activity.png"))
                tabs.get_by_role("tab",name="Home").click()
                page.screenshot(path=str(OUT/f"{engine}-{width}x{height}-home.png"))
                assert not errors,(engine,width,height,errors)
                context.close()
            browser.close()
finally:
    process.terminate()
    try:process.wait(timeout=5)
    except subprocess.TimeoutExpired:process.kill()
