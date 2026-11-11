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
                # An empty/unavailable GitHub feed must not stretch to the
                # height of unrelated Spotify, GPT and work-signal cards.
                assert page.evaluate("""() => {
                  const panel=document.querySelector(".p-feed-panel");
                  const stack=document.querySelector(".p-home-signal-stack");
                  if (!panel || !stack) return false;
                  if (matchMedia("(max-width:760px)").matches) return true;
                  // Populated timelines can legitimately be taller.
                  if (panel.querySelector("[data-feed-list] li")) return true;
                  return panel.getBoundingClientRect().height <
                    stack.getBoundingClientRect().height;
                }"""), (engine,device,"empty GitHub panel should fit content")
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
                for path in ("/work/","/writing/","/about/","/contact/","/listening/","/gpt/"):
                    r=page.goto(BASE+path,wait_until="domcontentloaded")
                    assert r.status==200,(engine,device,path)
                    assert page.locator("main h1").count()==1,(engine,device,path)
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (engine,device,path,"overflow")
                    if path=="/work/" and device=="mobile":
                        # The wide cinematic case study must collapse into
                        # one legible column rather than narrow side-by-side art/text.
                        assert page.evaluate("""() => {
                          const study=document.querySelector(".p-featured-study");
                          if(!study || study.children.length<2) return false;
                          const art=study.children[0].getBoundingClientRect();
                          const copy=study.children[1].getBoundingClientRect();
                          return art.width>=250 && copy.width>=250 &&
                            copy.top>=art.bottom-1 &&
                            copy.left>=art.left-1 && copy.right<=art.right+1 &&
                            art.height<=230;
                        }"""), (engine,device,"work case study mobile stack")
                    if path in ("/work/","/writing/"):
                        page.screenshot(path=str(OUT/f"{engine}-{device}-{path.strip('/')}.png"),full_page=True)
                # This browser-local fixture tests layout and UI behavior only.
                # It is never deployed, and its screenshots explicitly say SYNTHETIC.
                from datetime import datetime, timezone
                now=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
                fixture={"version":1,"source":"GitHub public events API",
                         "status":"available","checkedAt":now,"reason":None,"retryAt":None,
                         "events":[
                          {"kind":"push","label":"Pushed commits","repo":"devonalanakins/devonakins.com",
                           "at":now,"url":"https://github.com/devonalanakins/devonakins.com"},
                          {"kind":"pull_request","label":"Merged a pull request","repo":"devonalanakins/knowledge",
                           "at":now,"url":"https://github.com/devonalanakins/knowledge"},
                          {"kind":"release","label":"Published a release","repo":"devonalanakins/merit",
                           "at":now,"url":"https://github.com/devonalanakins/merit"},
                         ]}
                page.route("**/api/github/public-feed",lambda route: route.fulfill(status=200,
                    content_type="application/json",body=__import__("json").dumps(fixture)))
                r=page.goto(BASE+"/activity/",wait_until="domcontentloaded")
                assert r.status==200,(engine,device,"activity")
                page.locator("[data-feed-list] li").first.wait_for(timeout=10000)
                assert page.locator("[data-feed-list] li").count()==3
                assert page.locator('[data-github-count="push"]').inner_text()=="1"
                assert page.locator('[data-github-count="pull_request"]').inner_text()=="1"
                assert page.locator('[data-github-count="release"]').inner_text()=="1"
                assert page.locator("[data-github-highlights] li").count()==3
                # Concept design regression: genuine SVG iconography, category
                # colors and source badges must stay distinct and keyboard-safe.
                assert page.locator('.p-event-symbol[data-variant="push"] svg path').count()>=1
                assert page.locator('.p-event-symbol[data-variant="merged"] svg path').count()>=1
                assert page.locator('.p-event-symbol[data-variant="release"] svg path').count()>=1
                assert page.locator('.p-event-chip[data-variant="push"]').count()>=1
                assert page.locator('.p-event-chip[data-variant="merged"]').count()>=1
                assert page.locator('.p-event-chip[data-variant="release"]').count()>=1
                colors=page.evaluate('''() => ["push","merged","release"].map(kind =>
                  getComputedStyle(document.querySelector(
                    '.p-activity-main .p-event-symbol[data-variant="'+kind+'"]')).color)''')
                assert len(set(colors))==3,(engine,device,"activity colors",colors)
                assert page.locator(".p-source-spotify .p-brand-spotify path").count()==1
                assert page.locator(".p-source-github .p-brand-github path").count()==1
                assert page.locator("[data-spotify-source-state]").count()==1
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (engine,device,"activity overflow")
                page.evaluate('''() => {
                  const label=document.createElement("div");
                  label.textContent="SYNTHETIC TEST DATA — NOT LIVE GITHUB ACTIVITY";
                  Object.assign(label.style,{position:"fixed",zIndex:"9999",top:"0",left:"0",right:"0",
                    padding:"9px 16px",background:"#ffd098",color:"#111",fontSize:"13px",fontWeight:"700",
                    textAlign:"center"});
                  document.body.append(label);
                }''')
                page.screenshot(path=str(OUT/f"{engine}-{device}-activity-synthetic.png"),full_page=True)
                page.locator("body > div").last.evaluate("(el) => { if (el.textContent.includes('SYNTHETIC TEST DATA')) el.remove() }")
                assert page.locator("[data-public-github-feed]").count()==1
                assert page.get_by_role("button",name="Pull requests").count()==1
                page.get_by_role("button",name="Pull requests").click()
                assert page.get_by_role("button",name="Pull requests").get_attribute("aria-pressed")=="true"
                # When Cloudflare cannot reach GitHub, Chromium/WebKit must
                # fetch only GitHub's public events API via browser CORS,
                # discard private/unowned events and disclose the source.
                page.unroute("**/api/github/public-feed")
                from datetime import datetime, timezone
                import json
                rescue_at=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
                unavailable={
                    "version":1,"source":"GitHub public events API","status":"unavailable",
                    "checkedAt":rescue_at,"reason":"rate-limited","retryAt":rescue_at,
                    "events":[]}
                public_api_events=[
                    {"id":"123","type":"PushEvent","public":True,
                     "actor":{"login":"devonalanakins"},
                     "repo":{"name":"devonalanakins/unfeatured-browser-work"},
                     "created_at":rescue_at,
                     "payload":{"commits":[{"message":"NEVER SHOW PRIVATE-LOOKING COMMIT CONTENT"}]}},
                    {"id":"124","type":"PushEvent","public":False,
                     "actor":{"login":"devonalanakins"},
                     "repo":{"name":"devonalanakins/private-work"},
                     "created_at":rescue_at},
                ]
                page.route("**/api/github/public-feed",lambda route: route.fulfill(
                    status=200,content_type="application/json",body=json.dumps(unavailable)))
                api_url="https://api.github.com/users/devonalanakins/events/public?per_page=100"
                page.route(api_url,lambda route: route.fulfill(
                    status=200,headers={
                        "Content-Type":"application/json",
                        "Access-Control-Allow-Origin":"*",
                        "Access-Control-Allow-Methods":"GET"},
                    body=json.dumps(public_api_events)))
                page.goto(BASE+"/activity/",wait_until="domcontentloaded")
                page.get_by_text("devonalanakins/unfeatured-browser-work").first.wait_for(timeout=10000)
                assert "browser-direct GitHub API" in page.locator("[data-feed-status]").inner_text()
                assert "directly by this browser" in page.locator("[data-github-source-state]").inner_text()
                assert page.locator("[data-feed-list] li").count()==1
                assert page.get_by_text("NEVER SHOW PRIVATE-LOOKING COMMIT CONTENT").count()==0
                assert page.get_by_text("devonalanakins/private-work").count()==0
                page.unroute("**/api/github/public-feed")
                page.unroute(api_url)
                # All source fixtures are local, explicitly synthetic,
                # and never committed to public site pages or live source APIs.
                from datetime import datetime, timezone
                import json
                instant=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
                source_mode={"enabled":True}
                song={
                  "version":1,"mode":"playing","detailsVisible":True,"updatedAt":instant,
                  "track":{"title":"Synthetic test track","artist":"Fixture artist",
                           "album":"Synthetic QA","image":None,
                           "url":"https://open.spotify.com/track/"+("A"*22)},
                  "playback":{"progressMs":45000,"durationMs":220000}}
                public_playlist={
                  "version":1,"status":"available","checkedAt":instant,
                  "playlists":[{"id":"B"*22,"title":"Synthetic public playlist",
                    "url":"https://open.spotify.com/playlist/"+("B"*22),"image":None}]}
                gpt_reading={"metric":"profile_7d_tokens","value":1234567,"unit":"tokens",
                  "scope":"owner-profile","source":"owner-profile-capture",
                  "asOf":instant,"sourceUpdatedAt":None,"freshness":"recent"}
                gpt_snapshot={"state":"snapshot","metric":"profile_7d_tokens",
                  "count":1234567,"unit":"tokens","scope":"owner-profile",
                  "source":"owner-profile-capture","asOf":instant,
                  "sourceUpdatedAt":None,"freshness":"recent","observations":[gpt_reading]}
                aggregate={"version":4,"asOf":instant,
                  "work":{"visibility":"public","state":"developing",
                    "source":"editor-heartbeat","asOf":instant},
                  "gpt":gpt_snapshot,
                  "threads":{"version":1,"state":"connected","checkedAt":instant,
                    "posts":[{"href":"https://www.threads.com/@devonalanakins/post/CXtzA7JPq5V",
                      "text":"Synthetic verified source test","publishedAt":instant,"media":False}]}}
                def spotify_request(route):
                    current=song if source_mode["enabled"] else {
                      "version":1,"mode":"hidden","detailsVisible":False}
                    route.fulfill(status=200,content_type="application/json",body=json.dumps(current))
                def aggregate_request(route):
                    current=aggregate if source_mode["enabled"] else {
                      "version":4,"asOf":instant,"work":{"visibility":"hidden",
                        "state":"not-broadcasting","source":"none"},
                      "gpt":{"state":"disconnected","observations":[]},
                      "threads":{"version":1,"state":"disconnected","checkedAt":None,"posts":[]}}
                    route.fulfill(status=200,content_type="application/json",body=json.dumps(current))
                def playlists_request(route):
                    current=public_playlist if source_mode["enabled"] else {
                      "version":1,"status":"hidden","checkedAt":None,"playlists":[]}
                    route.fulfill(status=200,content_type="application/json",body=json.dumps(current))
                page.route("**/api/listening/now",spotify_request)
                page.route("**/api/activity/v4",aggregate_request)
                page.route("**/api/listening/collections",playlists_request)
                def mark_synthetic():
                    page.evaluate('''() => {
                      const label=document.createElement("div");
                      label.id="synthetic-qa-notice";
                      label.textContent="SYNTHETIC QA FIXTURE — NOT REAL SPOTIFY, GPT OR THREADS ACTIVITY";
                      Object.assign(label.style,{position:"fixed",zIndex:"9999",top:"0",left:"0",
                        right:"0",padding:"10px",background:"#f6d09f",color:"#111",
                        fontWeight:"bold",fontSize:"13px",textAlign:"center"});
                      document.body.append(label);
                    }''')
                page.goto(BASE+"/listening/",wait_until="domcontentloaded")
                page.wait_for_function("() => document.querySelector('[data-spotify-state]')?.textContent === 'IN THE ZONE'")
                assert page.locator("[data-spotify-title]").inner_text()=="Synthetic test track"
                assert page.locator("[data-spotify-progress]").is_visible()
                assert page.locator("[data-spotify-link]").get_attribute("href").startswith("https://open.spotify.com/track/")
                page.get_by_text("Synthetic public playlist").wait_for(timeout=10000)
                mark_synthetic()
                page.screenshot(path=str(OUT/f"{engine}-{device}-listening-synthetic.png"),full_page=True)
                page.goto(BASE+"/gpt/",wait_until="domcontentloaded")
                page.wait_for_function("() => document.querySelector('[data-gpt-value]')?.textContent === '1.23M'")
                assert "Captured" in page.locator("[data-gpt-time]").inner_text()
                mark_synthetic()
                page.screenshot(path=str(OUT/f"{engine}-{device}-gpt-synthetic.png"),full_page=True)
                page.goto(BASE+"/activity/",wait_until="domcontentloaded")
                page.wait_for_function("() => document.querySelector('[data-work-state]')?.textContent === 'EDITOR OBSERVED'")
                assert page.locator("[data-spotify-title]").inner_text()=="Synthetic test track"
                assert page.locator("[data-threads-state]").inner_text()=="CONNECTED"
                assert page.locator("[data-work-title]").inner_text()=="In the Zone — Coding"
                # Owner convention with no editor evidence: public Spotify
                # still marks coding mode, but its source must be unambiguous.
                aggregate["work"]={"visibility":"hidden","state":"not-broadcasting","source":"none"}
                page.reload(wait_until="domcontentloaded")
                page.wait_for_function("() => document.querySelector('[data-work-state]')?.textContent === 'SPOTIFY SIGNAL'")
                assert page.locator("[data-work-title]").inner_text()=="In the Zone — Coding"
                assert "owner-defined" in page.locator("[data-work-detail]").inner_text()
                # Status-only sharing must not publish title or artwork.
                song["detailsVisible"]=False
                song.pop("track")
                song.pop("playback")
                page.reload(wait_until="domcontentloaded")
                page.wait_for_function("() => document.querySelector('[data-spotify-title]')?.textContent === 'Coding with music'")
                assert page.locator("[data-spotify-state]").inner_text()=="IN THE ZONE"
                assert page.locator("[data-spotify-cover]").is_hidden()
                assert page.locator("[data-work-state]").inner_text()=="SPOTIFY SIGNAL"
                source_mode["enabled"]=False
                page.reload(wait_until="domcontentloaded")
                page.wait_for_function("() => document.querySelector('[data-spotify-state]')?.textContent === 'PRIVATE'")
                assert page.locator("[data-spotify-title]").inner_text()=="Playback not shared"
                assert page.locator("[data-spotify-cover]").is_hidden()
                assert page.locator("[data-gpt-value]").inner_text()=="—"
                assert page.locator("[data-threads-state]").inner_text()=="NOT CONNECTED"
                assert page.locator("[data-work-state]").inner_text()=="NO ACTIVE SIGNAL"
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (engine,device,"signals privacy overflow")
                page.unroute("**/api/listening/now")
                page.unroute("**/api/activity/v4")
                page.unroute("**/api/listening/collections")
                page.unroute("**/api/github/public-feed")
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
