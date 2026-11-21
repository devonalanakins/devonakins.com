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

def navigate(page,key,width):
    if width<=1100:
        page.locator('.lab-menu-toggle').click()
        page.locator(f'#lab-menu [data-one-target="{key}"]').click()
    else:page.locator(f'.lab-tabs-desktop [data-one-target="{key}"]').click()
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
                    navigate(page,'work',width)
                    page.locator('[data-lab-project-search]').fill('Merit')
                    length=page.evaluate('history.length')
                    navigate(page,'work',width)
                    assert page.evaluate('history.length')==length,'Duplicate current-view history entry'
                    page.go_back();selected(page,'experience')
                    page.go_back();selected(page,'home')
                    wait_for_condition(page,'Math.abs(scrollY-'+str(before)+')<3')
                    wait_for_condition(page,"document.activeElement.dataset.oneView==='home'")
                    assert page.url.endswith('/?keep=query')
                    page.go_forward();selected(page,'experience')
                    page.go_forward();selected(page,'work')
                    assert page.locator('[data-lab-project-search]').input_value()=='Merit'
                    # Back with an open dialog must not leave an inert background or focus trap.
                    page.locator('.lab-menu-toggle' if width<=760 else '.lab-desktop-menu').click()
                    assert page.locator('#lab-menu').is_visible()
                    page.go_back();selected(page,'experience')
                    page.locator('#lab-menu').wait_for(state='hidden')
                    wait_for_condition(page,"!document.documentElement.classList.contains('lab-menu-open')")
                    wait_for_condition(page,"document.activeElement.dataset.oneView==='experience'")
                    navigate(page,'home',width)
                    # A real modified click retains the browser's native new-tab behavior.
                    with context.expect_page() as opened:
                        page.locator('[data-lab-destination="experience"]').click(modifiers=['Control'])
                    tab=opened.value;tab.wait_for_load_state('networkidle');selected(tab,'experience')
                    assert '/research/' in tab.url
                    selected(page,'home');tab.close()
                    # System preference changes update controls without a stale disabled tooltip.
                    page.locator('.lab-menu-toggle' if width<=760 else '.lab-desktop-menu').click()
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
                sample.evaluate(Path('node_modules/axe-core/axe.min.js').read_text())
                violations=sample.evaluate("async()=> (await axe.run()).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
                assert not violations,(engine,'case study',violations)
                sample.locator('.lab-menu-toggle').click()
                sample.locator('#lab-menu [data-one-target="home"]').click()
                sample.wait_for_url(BASE+'/');selected(sample,'home')
                context.close()
                # Owner-reported Apple Music is metadata, not audio playback or
                # a browser fetch of Apple artwork. The source must clear on
                # revocation, and ambient modes are explicitly owner-selected.
                context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':390,'height':844})
                stamp=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
                report={'version':1,'source':'owner-shortcut','state':'reported','kind':'song',
                        'detailsVisible':True,'reportedAt':stamp,'title':'TEST FIXTURE — never published',
                        'artist':'Synthetic privacy test',
                        'url':'https://music.apple.com/us/album/example/123456?i=1234567890'}
                context.route('**/api/listening/apple',lambda route:route.fulfill(json=report))
                remote=[]
                def prevent_remote(route):
                    remote.append(route.request.url)
                    route.abort()
                context.route('https://music.apple.com/**',prevent_remote)
                page=context.new_page();page.goto(BASE,wait_until='networkidle')
                wait_for_condition(page,"document.querySelector('[data-apple-listening-title]')?.textContent?.startsWith('TEST FIXTURE')")
                page.locator('.lab-signal-apple summary').click()
                assert 'Synthetic privacy test' in page.locator('.lab-signal-apple').inner_text()
                assert page.locator('[data-apple-listening-link]').get_attribute('href')=='https://music.apple.com/us/album/example/123456?i=1234567890'
                assert page.locator('.lab-signal-apple img, .lab-signal-apple audio, .lab-signal-apple iframe').count()==0
                assert not remote,(engine,remote)
                # An owner's declared Ambient Music mode does not imply an
                # identified track, automatic mode discovery or a music player.
                report={'version':1,'source':'owner-shortcut','state':'reported','kind':'ambient',
                        'mood':'Chill','reportedAt':stamp}
                page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
                wait_for_condition(page,"document.querySelector('[data-apple-listening-title]')?.textContent==='Ambient Music · Chill'")
                assert 'TEST FIXTURE' not in page.locator('.lab-signal-apple').inner_text()
                assert page.locator('[data-apple-listening-link]').is_hidden()
                # Revocation removes retained metadata on the next refresh.
                report={'version':1,'source':'owner-shortcut','state':'hidden'}
                page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
                wait_for_condition(page,"document.querySelector('[data-apple-listening-title]')?.textContent==='Listening is private'")
                assert page.locator('[data-apple-listening-link]').is_hidden()
                assert 'TEST FIXTURE' not in page.locator('.lab-signal-apple').inner_text()
                assert not remote,(engine,remote)
                results.append({'engine':engine,'apple_metadata_only':'passed','revocation':'cleared','ambient_owner_declared':'passed'})
                context.close()
            finally:browser.close()
    (OUT/'navigation-and-media-privacy.json').write_text(json.dumps(results,indent=2))
    print('Chromium/WebKit: history, Back/Forward, saved scroll, query/deep links, modified clicks, modal dismissal, dynamic reduced motion, no-referrer artwork and consent revocation passed.')
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
