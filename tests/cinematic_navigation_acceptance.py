import ssl
from urllib.parse import urlparse
from cinematic_browser_helpers import wait_for_condition, wait_for_local_preview
import os
"""Actual browser history and media privacy; fixtures never become public activity."""
import base64
import datetime
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('LABORATORY_TEST_ORIGIN','http://127.0.0.1:4181').rstrip('/')
LOCAL_TLS=urlparse(BASE).scheme=='https' and urlparse(BASE).hostname=='127.0.0.1'
TLS_CONTEXT=ssl._create_unverified_context() if LOCAL_TLS else None
OUT=Path('browser-qa/laboratory')
OUT.mkdir(parents=True,exist_ok=True)
server=None if os.environ.get('LABORATORY_TEST_ORIGIN') else subprocess.Popen(['./node_modules/.bin/vite','preview','--host','127.0.0.1','--port','4181','--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)

def selected(page,key):
    page.locator(f'[data-one-view="{key}"]').wait_for(state='visible')
    assert page.locator('[data-one-view]:visible').count()==1

def navigate(page,key):
    page.locator(f'.site-header [data-one-go="{key}"]').click()
    selected(page,key)

try:
    wait_for_local_preview(BASE,server,TLS_CONTEXT)
    results=[]
    with sync_playwright() as pw:
        for engine in ('chromium','webkit'):
            browser=getattr(pw,engine).launch()
            try:
                for width,height in ((1536,720),(390,844)):
                    context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':width,'height':height})
                    page=context.new_page()
                    # Public and legacy deep links work on direct entry and reload.
                    for fragment,key in (('research','experience'),('projects','work'),('fieldnotes','writing'),('one-panel-portfolio','portfolio')):
                        page.goto(BASE+'/?keep=query#'+fragment,wait_until='networkidle');selected(page,key)
                        page.reload(wait_until='networkidle');selected(page,key)
                    page.goto(BASE+'/?keep=query',wait_until='networkidle');selected(page,'home')
                    page.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)')
                    destination=page.locator('[data-lab-destination="experience"]')
                    destination.scroll_into_view_if_needed()
                    # Click actionability can reposition an animated link. Capture
                    # the scroll position before its navigation handler executes.
                    destination.evaluate("""link => {
                      link.addEventListener('click', () => { window.beforeLabNavigation = scrollY; },
                                            {capture:true, once:true});
                    }""")
                    destination.click();selected(page,'experience')
                    before=page.evaluate('window.beforeLabNavigation')
                    assert before>20,(engine,width,before)
                    assert page.evaluate('scrollY')==0
                    navigate(page,'work')
                    assert page.locator('.site-primary-nav a[href="/work/"][aria-current="page"]').count()==1
                    assert page.locator('.site-brand[aria-current="page"]').count()==0
                    page.locator('[data-lab-project-search]').fill('Merit')
                    length=page.evaluate('history.length')
                    navigate(page,'work')
                    assert page.evaluate('history.length')==length,'Duplicate current-view history entry'
                    page.go_back();selected(page,'experience')
                    assert page.locator('.site-primary-nav a[aria-current="page"]').count()==0
                    assert page.locator('.site-secondary-nav a[href="/research/"][aria-current="page"]').count()==1
                    page.go_back();selected(page,'home')
                    assert page.locator('.site-primary-nav a[aria-current="page"]').count()==0
                    assert page.locator('.site-brand[aria-current="page"]').count()==1
                    wait_for_condition(page,'Math.abs(scrollY-'+str(before)+')<3')
                    wait_for_condition(page,"document.activeElement.dataset.oneView==='home'")
                    assert page.url.endswith('/?keep=query')
                    page.go_forward();selected(page,'experience')
                    page.go_forward();selected(page,'work')
                    assert page.locator('[data-lab-project-search]').input_value()=='Merit'
                    # Back with an open dialog must not leave an inert background or focus trap.
                    page.locator('.site-settings').click()
                    assert page.locator('#lab-menu').is_visible()
                    page.go_back();selected(page,'experience')
                    page.locator('#lab-menu').wait_for(state='hidden')
                    wait_for_condition(page,"!document.documentElement.classList.contains('lab-menu-open')")
                    wait_for_condition(page,"document.activeElement.dataset.oneView==='experience'")
                    navigate(page,'home')
                    # A real modified click retains the browser's native new-tab behavior.
                    with context.expect_page() as opened:
                        page.locator('[data-lab-destination="experience"]').click(modifiers=['Control'])
                    tab=opened.value
                    tab.wait_for_url(BASE+'/research/',wait_until='domcontentloaded')
                    selected(tab,'experience')
                    assert '/research/' in tab.url
                    selected(page,'home');tab.close()
                    # System preference changes update controls without a stale disabled tooltip.
                    page.locator('.site-settings').click()
                    page.emulate_media(reduced_motion='reduce')
                    wait_for_condition(page,"document.querySelector('[data-lab-motion]').disabled")
                    assert 'Reduced motion' in page.locator('[data-lab-motion]').get_attribute('title')
                    page.emulate_media(reduced_motion='no-preference')
                    wait_for_condition(page,"!document.querySelector('[data-lab-motion]').disabled")
                    assert page.locator('[data-lab-motion]').get_attribute('title')==''
                    page.locator('[data-lab-menu-close]').click()
                    results.append({'engine':engine,'viewport':[width,height],'history':'passed','deep_links':'passed','modified_click':'passed','scroll_restore':before,'dynamic_reduced_motion':'passed'})
                    context.close()
                context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':390,'height':844})
                sample=context.new_page()
                for path,key,canonical in (('/research/','experience','/research/'),('/work/','work','/work/'),('/projects/','work','/work/'),('/systems/','systems','/systems/'),('/portfolio/','portfolio','/portfolio/'),('/fieldnotes/','writing','/fieldnotes/'),('/contact/','contact','/contact/')):
                    sample.goto(BASE+path,wait_until='networkidle');selected(sample,key)
                    assert sample.locator('link[rel="canonical"]').get_attribute('href')=='https://devonakins.com'+canonical
                sample.goto(BASE+'/work/merit/',wait_until='networkidle')
                assert sample.locator('.lab-case-study h1').inner_text()=='Merit'
                assert sample.locator('.site-primary-nav a[href="/work/"][aria-current="page"]').count()==1
                assert sample.locator('.site-brand[aria-current="page"]').count()==0
                sample.evaluate(Path('node_modules/axe-core/axe.min.js').read_text())
                violations=sample.evaluate("async()=> (await axe.run()).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
                assert not violations,(engine,'case study',violations)
                sample.locator('.site-brand').click()
                sample.wait_for_url(BASE+'/');selected(sample,'home')
                context.close()
                # Test-only approved playback checks the actual outgoing cover request.
                context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':390,'height':844})
                stamp=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
                cover='https://i.scdn.co/image/CinematicPrivacyFixture'
                playback={'version':1,'mode':'playing','detailsVisible':True,'updatedAt':stamp,
                          'track':{'title':'TEST FIXTURE — never published','artist':'Synthetic privacy test','url':'https://open.spotify.com/track/0123456789012345678901','image':cover}}
                context.route('**/api/listening/now',lambda route:route.fulfill(json=playback))
                requested=[]
                def image_request(route):
                    requested.append(route.request.all_headers())
                    route.fulfill(content_type='image/gif',body=base64.b64decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='))
                context.route(cover,image_request)
                page=context.new_page();page.goto(BASE,wait_until='networkidle')
                wait_for_condition(page,"document.querySelector('[data-spotify-title]').textContent.startsWith('TEST FIXTURE')")
                page.locator('.lab-signal-spotify summary').click()
                page.locator('[data-spotify-cover]').scroll_into_view_if_needed()
                wait_for_condition(page,"document.querySelector('[data-spotify-cover]').complete && document.querySelector('[data-spotify-cover]').naturalWidth>0")
                assert requested and not requested[0].get('referer'),(engine,requested)
                # Revocation removes retained metadata and artwork immediately on source refresh.
                playback={'version':1,'mode':'hidden'}
                page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
                wait_for_condition(page,"document.querySelector('[data-spotify-title]').textContent==='Playback not shared'")
                assert page.locator('[data-spotify-cover]').is_hidden()
                assert page.locator('[data-spotify-cover]').get_attribute('src') is None
                assert 'TEST FIXTURE' not in page.locator('.lab-signal-spotify').inner_text()
                results.append({'engine':engine,'cover_referrer':'absent','revocation':'cleared'})
                context.close()
            finally:browser.close()
    (OUT/'navigation-and-media-privacy.json').write_text(json.dumps(results,indent=2))
    print('Chromium/WebKit: history, Back/Forward, saved scroll, query/deep links, modified clicks, modal dismissal, dynamic reduced motion, no-referrer artwork and consent revocation passed.')
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
