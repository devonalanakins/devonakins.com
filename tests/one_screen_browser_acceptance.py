"""Single-viewport candidate acceptance: Chromium/WebKit, desktop and phone."""
import subprocess, time, urllib.request, json
from datetime import datetime, timezone
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
                assert page.locator(".prestige-player").count()==1,(engine,width,height,"prestige identity")
                assert page.locator(".prestige-command").count()==1,(engine,width,height,"public signal board")
                assert page.locator(".prestige-identity-copy h1").is_visible()
                assert "SOFTWARE DEVELOPER" in page.locator(".prestige-subtitle").inner_text()
                # High-level gamer styling is editorial, not invented XP, levels, or ranks.
                assert page.locator(".prestige-build-row").count()==3
                for selector in (".prestige-player",".prestige-command",".prestige-player-actions",".prestige-activity-card",".prestige-stat-pair"):
                    assert page.evaluate("""selector => {
                      const root=document.querySelector('.one-stage').getBoundingClientRect();
                      const rect=document.querySelector(selector).getBoundingClientRect();
                      return rect.top >= root.top-3 && rect.bottom <= root.bottom+3 &&
                        rect.left >= root.left-3 && rect.right <= root.right+3;
                    }""", selector),(engine,width,height,selector,"prestige panel containment")

                assert page.locator('img[src*="headshot"]').count()==0,(engine,width,height,"no portrait resource")
                assert page.locator('[data-one-view]:visible').count()==1,(engine,width,height,"initial panel")
                assert page.locator('[data-public-github-feed]').count()==2
                assert page.locator('[data-public-spotify]').count()==1
                assert page.locator('.prestige-command [data-public-work]').count()==1
                # The Home tile is a dated owner-recorded GPT snapshot;
                # Activity retains a separate consent-filtered live card.
                assert page.locator('[data-public-gpt]').count()==1,(engine,width,height,"activity GPT")
                assert page.locator('.one-gpt-record').count()==1,(engine,width,height,"dated GPT")
                assert page.locator('.one-gpt-record').get_attribute("href")=="/gpt/"
                assert "≈3.3B" in page.locator('.one-gpt-record').inner_text()
                assert "526.3M" in page.locator('.one-gpt-record').inner_text()
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
                      const spotify=document.querySelector(".one-signal-bottom .p-spotify-card");
                      const recorded=document.querySelector(".one-signal-bottom .one-gpt-record");
                      const within=(card,child) => {
                        if(!card || !child) return false;
                        const a=card.getBoundingClientRect(),b=child.getBoundingClientRect();
                        return b.top>=a.top-2 && b.bottom<=a.bottom+2 &&
                          b.left>=a.left-2 && b.right<=a.right+2;
                      };
                      return within(spotify,spotify?.querySelector("[data-spotify-title]")) &&
                        [...(recorded?.querySelectorAll(".one-gpt-record-values strong")||[])].length===2 &&
                        [...recorded.querySelectorAll(".one-gpt-record-values strong")].every(v => within(recorded,v));
                    }"""),(engine,width,height,"source title containment")
                # Dense 320px phones must keep both career actions together and
                # never clip the labels or the sourced GPT numbers behind a panel.
                if width<=400 and height<=700:
                    assert page.evaluate("""() => {
                      const actions=[...document.querySelectorAll('.prestige-player-actions .one-button')];
                      const player=document.querySelector('.prestige-player').getBoundingClientRect();
                      const tiles=document.querySelector('.prestige-stat-pair').getBoundingClientRect();
                      const stage=document.querySelector('.one-stage').getBoundingClientRect();
                      const status=document.querySelector('#one-home-github [data-feed-status]').getBoundingClientRect();
                      if(actions.length!==2)return false;
                      const a=actions[0].getBoundingClientRect(),b=actions[1].getBoundingClientRect();
                      return Math.abs(a.top-b.top)<3 && a.right<=player.right+2 &&
                        b.right<=player.right+2 && b.bottom<=player.bottom+2 &&
                        tiles.bottom<=stage.bottom+2 && tiles.height>=84 &&
                        status.top>=stage.top && status.bottom<=tiles.top;
                    }"""),(engine,width,height,"compact action wrapping or sourced stat clipping")

                # The page includes two differently sized tablists: choose visible tab.
                tabs=page.locator('.one-tabs-mobile [role="tablist"]' if width<=760 else '.one-tabs-desktop [role="tablist"]')
                for label,key in (("Career","experience"),("Missions","work"),("Activity","activity"),("Writing","writing"),("Contact","contact"),("Profile","home")):
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
                tabs.get_by_role("tab",name="Profile").click()
                if (width,height) in ((1440,900),(390,844)):
                    # Keyboard equivalents for the six-panel gamer HUD must
                    # select, focus and visibly render the intended panels.
                    tabs.get_by_role("tab",name="Profile").focus()
                    page.keyboard.press("ArrowRight")
                    assert tabs.get_by_role("tab",name="Career").get_attribute("aria-selected")=="true"
                    assert page.locator('[data-one-view="experience"]').is_visible()
                    assert tabs.get_by_role("tab",name="Career").evaluate("(el) => el===document.activeElement")
                    page.keyboard.press("End")
                    assert tabs.get_by_role("tab",name="Contact").get_attribute("aria-selected")=="true"
                    assert page.locator('[data-one-view="contact"]').is_visible()
                    page.keyboard.press("Home")
                    assert tabs.get_by_role("tab",name="Profile").get_attribute("aria-selected")=="true"
                    assert page.locator('[data-one-view="home"]').is_visible()
                page.screenshot(path=str(OUT/f"{engine}-{width}x{height}-home.png"))
                assert not errors,(engine,width,height,errors)
                context.close()
            # Normal motion is intentional; motion-reduced checks above verify
            # every panel stays usable without animation.
            motion_context=browser.new_context(viewport={"width":1440,"height":900},
                reduced_motion="no-preference")
            motion_page=motion_context.new_page()
            motion_page.goto(BASE+"/",wait_until="domcontentloaded")
            animation=motion_page.evaluate("""() => ({
                backdrop:getComputedStyle(document.querySelector('.one-world-glow')).animationName,
                intro:getComputedStyle(document.querySelector('.prestige-identity-main')).animationName
            })""")
            assert "prestige-nebula" in animation["backdrop"],(engine,"ambient animation",animation)
            assert "prestige-reveal" in animation["intro"],(engine,"identity entrance",animation)
            motion_context.close()
            # Rotate a device without a hard reload. A synthetic, source-shaped
            # GitHub response verifies the actual cached event count changes
            # immediately with the viewport while the source labels remain.
            timestamp=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
            event={"kind":"push","label":"Pushed commits",
                   "repo":"devonalanakins/devonakins.com","at":timestamp,
                   "url":"https://github.com/devonalanakins/devonakins.com"}
            response={"version":1,"source":"GitHub public events API",
                      "status":"available","checkedAt":timestamp,
                      "reason":None,"retryAt":None,"events":[event]*5}
            rotation=browser.new_context(viewport={"width":390,"height":844},
                device_scale_factor=1,reduced_motion="reduce",is_mobile=True,has_touch=True)
            rotated=rotation.new_page()
            rotated.route("**/api/github/public-feed",lambda route:route.fulfill(
                status=200,content_type="application/json",body=json.dumps(response)))
            rotated.goto(BASE+"/",wait_until="domcontentloaded")
            rotated.wait_for_function("""() =>
                document.querySelector('#one-home-github [data-feed-list]').children.length===2""")
            assert rotated.locator("#one-home-github").get_attribute("data-limit")=="2"
            rotated.set_viewport_size({"width":844,"height":390})
            rotated.wait_for_function("""() =>
                document.querySelector('#one-home-github').dataset.limit==='1' &&
                document.querySelector('#one-home-github [data-feed-list]').children.length===1 &&
                document.querySelector('#one-activity-github').dataset.limit==='2'""")
            rotated.set_viewport_size({"width":1440,"height":900})
            rotated.wait_for_function("""() =>
                document.querySelector('#one-home-github').dataset.limit==='4' &&
                document.querySelector('#one-home-github [data-feed-list]').children.length===4 &&
                document.querySelector('#one-activity-github').dataset.limit==='6'""")
            assert rotated.locator("#one-home-github li").first.inner_text().find("devonalanakins/devonakins.com")>=0
            rotation.close()
            browser.close()
finally:
    process.terminate()
    try:process.wait(timeout=5)
    except subprocess.TimeoutExpired:process.kill()
