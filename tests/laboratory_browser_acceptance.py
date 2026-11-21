import ssl
from urllib.parse import urlparse
from cinematic_browser_helpers import wait_for_condition, wait_for_local_preview
import os
"""Approved cinematic composition: independent DOM, truthful sources and real browsers."""
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('LABORATORY_TEST_ORIGIN','http://127.0.0.1:4179').rstrip('/')
LOCAL_TLS=urlparse(BASE).scheme=='https' and urlparse(BASE).hostname=='127.0.0.1'
TLS_CONTEXT=ssl._create_unverified_context() if LOCAL_TLS else None
OUT = Path('browser-qa/laboratory')
OUT.mkdir(parents=True, exist_ok=True)
SIZES = ((320,568),(375,667),(390,844),(393,852),(428,926),(768,1024),
         (1024,768),(1440,900),(1536,864),(1920,1080))
server = None if os.environ.get('LABORATORY_TEST_ORIGIN') else subprocess.Popen(['./node_modules/.bin/vite','preview','--host','127.0.0.1','--port','4179','--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)

def navigate(page,key,width):
    if width<=1100:
        page.locator('.lab-menu-toggle').click()
        page.locator(f'#lab-menu [data-one-target="{key}"]').click()
        assert not page.locator('#lab-menu').is_visible()
    elif key in ('activity','contact'):
        page.locator('.lab-desktop-menu').click()
        page.locator(f'#lab-menu [data-one-target="{key}"]').click()
    else:
        page.locator(f'.lab-tabs-desktop [data-one-target="{key}"]').click()
    assert page.locator(f'[data-one-view="{key}"]').is_visible()

try:
    wait_for_local_preview(BASE,server,TLS_CONTEXT)
    with sync_playwright() as pw:
        for engine in ('chromium','webkit'):
            browser=getattr(pw,engine).launch()
            try:
                for width,height in SIZES:
                    context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':width,'height':height},reduced_motion='reduce' if width==375 else 'no-preference')
                    page=context.new_page()
                    errors=[]
                    page.on('pageerror',lambda error:errors.append(str(error)))
                    # Public landing and internal views no longer query the
                    # editor/Threads API after removing those UI components.
                    private_feed_requests=[]
                    page.on('request',lambda request:private_feed_requests.append(request.url)
                            if '/api/activity/v4' in request.url else None)
                    response=page.goto(BASE,wait_until='networkidle')
                    assert response and response.status==200,(engine,width,'Public navigation failed')
                    assert page.evaluate("getComputedStyle(document.querySelector('.one-skip')).clipPath !== 'none'")
                    page.locator('.one-skip').focus()
                    assert page.evaluate("getComputedStyle(document.querySelector('.one-skip')).clipPath === 'none'")
                    page.locator('.lab-brand').focus()
                    assert page.evaluate("getComputedStyle(document.querySelector('.one-skip')).clipPath !== 'none'")
                    assert page.title()=='Devon Alan Akins — CEO, Software Engineering & Research'
                    assert 'Devon' in page.locator('.lab-portfolio-hero h1').inner_text() and 'Alan Akins' in page.locator('.lab-portfolio-hero h1').inner_text()
                    assert page.locator('.lab-focus-card').count()==3
                    # The personal photograph is an optional packaged first-party
                    # asset: never show a broken image or a placeholder if absent.
                    personal=page.locator('.lab-personal')
                    if personal.count():
                        assert personal.is_visible()
                        assert page.locator('.lab-personal-portrait img').get_attribute('src')=='/professional/devon-portrait.avif'
                        # The portrait is intentionally lazy-loaded below the fold.
                        # Request it by bringing it into view, then wait for decode;
                        # checking naturalWidth immediately at load is a false failure.
                        page.locator('.lab-personal-portrait img').scroll_into_view_if_needed()
                        page.wait_for_function("() => {const im=document.querySelector('.lab-personal-portrait img');return im.complete && im.naturalWidth>=400}",timeout=15000)
                        page.evaluate("window.scrollTo(0,0)")
                        assert page.locator('.lab-personal-portrait img').get_attribute('alt')
                        assert page.evaluate("""() => {
                          const hero=document.querySelector('.lab-portfolio-hero').getBoundingClientRect();
                          const personal=document.querySelector('.lab-personal').getBoundingClientRect();
                          const focus=document.querySelector('.lab-focus').getBoundingClientRect();
                          return Math.max(hero.bottom,personal.bottom)<=focus.top+3 && (innerWidth>760 || hero.bottom<=personal.top+3);
                        }"""),(engine,width,'portrait should follow hero and precede work focus')
                    else:
                        assert page.locator('img[src="/professional/devon-portrait.avif"]').count()==0
                    assert page.locator('.lab-focus-card--nona').is_visible()
                    assert page.locator('.lab-hero-field').count()==0
                    assert 'INDEPENDENT SOFTWARE DEVELOPER' in page.locator('.lab-hero-name').inner_text()
                    assert page.locator('.lab-destination').count()==2
                    assert page.locator('.lab-signal-tile').count()==2
                    assert page.locator('[data-one-view]').count()==8
                    assert page.locator('[data-public-github-feed]').count()==2
                    assert page.locator('[data-public-work]').count()==0
                    assert page.locator('[data-public-spotify]').count()==1
                    assert page.locator('[data-public-threads]').count()==0
                    assert page.locator('.lab-footer .one-social-icon--threads').count()==1
                    assert page.locator('.lab-explore-heading').count()==1
                    assert page.locator('[data-public-gpt],a[href="/gpt/"]').count()==0
                    assert page.locator('.lab-tabs-desktop [data-one-target]').count()==3
                    assert page.locator('#lab-menu [data-one-target]').count()==3
                    if width<=1100:
                        menu_icon=page.locator('.lab-menu-toggle span').first.bounding_box()
                        assert menu_icon and menu_icon['width']>=20 and menu_icon['height']>=1,(engine,width,'Menu icon has no visible stroke')
                    assert page.locator('.lab-work-feature').count()==1
                    assert page.locator('.lab-research-journal').count()==1
                    assert page.locator('.lab-footer .one-social-icon').count()==4
                    assert page.locator('.lab-portfolio-hero picture').count()==0
                    assert page.locator('.lab-destination img').count()==0
                    # The authored design is a native two-dimensional SVG/CSS experience.
                    # No Three.js, WebGL scene, 3D orbital sculpture, or perspective cards.
                    assert page.locator('[data-lab-scene-canvas],.lab-live-scene,.lab-field-reticle,.lab-card-geometry').count()==0
                    assert page.locator('.lab-field-traces').count()==0
                    assert page.locator('.lab-trace').count()==0
                    assert page.locator('.lab-card-print').count()==2
                    assert page.evaluate("""() => [...document.querySelectorAll('script[src]')].every(s=>!s.src.includes('cinematic-environment'))""")
                    assert page.locator('.da-name').is_visible()
                    geometry=page.evaluate('''() => {
                      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
                      return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,header:rect('.lab-header'),hero:rect('.lab-portfolio-hero'),focus:rect('.lab-focus'),signals:rect('.lab-portfolio-signals'),explore:rect('.lab-explore-heading'),selected:rect('.lab-portfolio-selected'),destinations:rect('.lab-destinations'),footer:rect('.lab-footer'),cards:[...document.querySelectorAll('.lab-destination')].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})),signalCards:[...document.querySelectorAll('.lab-signal-tile')].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}))};}''')
                    assert geometry['scroll']<=width+1,(engine,width,geometry)
                    assert geometry['hero']['bottom']<=geometry['focus']['y']+3
                    assert geometry['focus']['bottom']<=geometry['explore']['y']+3
                    assert geometry['selected']['bottom']<=geometry['signals']['y']+3
                    assert geometry['explore']['bottom']<=geometry['destinations']['y']+3
                    assert geometry['destinations']['y']<geometry['footer']['y']
                    if width<=760:
                        assert page.locator('.lab-tabs-desktop').is_hidden()
                        assert page.locator('.lab-menu-toggle').is_visible()
                        assert len(set(round(c['x']) for c in geometry['cards']))==1
                        assert len(set(round(c['y']) for c in geometry['cards']))==2
                        assert len(set(round(c['x']) for c in geometry['signalCards']))==(1 if width<=350 else 2)
                        assert len(set(round(c['y']) for c in geometry['signalCards']))==(2 if width<=350 else 1)
                        assert page.evaluate("getComputedStyle(document.body).overflowY")!='hidden'
                        page.locator('.lab-menu-toggle').click()
                        assert page.locator('#lab-menu').is_visible()
                        page.keyboard.press('Escape')
                        assert page.locator('#lab-menu').is_hidden()
                        wait_for_condition(page,"document.querySelector('.lab-menu-toggle').getAttribute('aria-expanded')==='false'")
                        assert page.evaluate("document.activeElement.hasAttribute('data-lab-menu-open')")
                    elif width<=1100:
                        assert page.locator('.lab-tabs-desktop').is_hidden()
                        assert page.locator('.lab-menu-toggle').is_visible()
                        page.locator('.lab-menu-toggle').click()
                        assert page.locator('#lab-menu').is_visible()
                        page.keyboard.press('Escape')
                        assert page.locator('#lab-menu').is_hidden()
                    else:
                        assert page.locator('.lab-tabs-desktop').is_visible()
                    if width==1536:
                        # Responsive editorial content flows instead of fixed image-era landmarks.
                        assert abs(geometry['header']['height']-76)<=8
                        assert geometry['signals']['y']-geometry['destinations']['y']>=100
                    (OUT/f'{engine}-landmarks-{width}.json').write_text(json.dumps(geometry,indent=2))
                    page.mouse.click(width-2,65)
                    page.screenshot(path=str(OUT/f'{engine}-cinematic-{width}x{height}.png'),full_page=True)
                    for key in ('work','experience'):
                        page.locator(f'[data-lab-destination="{key}"]').click()
                        assert page.locator(f'[data-one-view="{key}"]').is_visible()
                        assert page.evaluate('document.activeElement.dataset.oneView')==key
                        if key=='experience':
                            if width in (390,1536):
                                assert page.evaluate("""() => {
                                  const container=document.querySelector('.lab-research');
                                  const journal=container.querySelector('.lab-research-journal').getBoundingClientRect();
                                  const sources=['.lab-section-intro','.da-directions','.da-investigations'];
                                  const bottom=Math.max(...sources.map(s=>container.querySelector(s).getBoundingClientRect().bottom));
                                  return journal.top>=bottom-5 && journal.width>container.clientWidth*.75;
                                }"""),(engine,width,'Research journal must follow the instrument, full width')
                            assert page.locator('.da-directions .da-direction').count()==3
                            assert 'Anevum Open Institute' in page.locator('.da-directions').inner_text().replace('\n',' ')
                            assert not page.locator('.lab-research-instrument').is_visible()
                            page.locator('.da-sketch > summary').click()
                            curve=page.locator('[data-lab-curve="interactive"]')
                            before=curve.get_attribute('d')
                            page.locator('[data-lab-axis="a"]').fill('5')
                            assert curve.get_attribute('d')!=before
                            assert curve.evaluate("node => getComputedStyle(node).strokeDasharray")=="none"
                            assert 'a = 5' in page.locator('[data-lab-model-caption]').inner_text()
                            page.locator('.da-sketch > summary').click()
                        if key=='work':
                            if width in (390,1536):
                                assert page.evaluate("""() => {
                                  const root=document.querySelector('.lab-work-hub');
                                  const blocks=['.lab-section-intro','.lab-work-feature','.da-selected','.lab-work-collection','.lab-work-method'].map(s=>root.querySelector(s).getBoundingClientRect());
                                  return blocks.every((r,i)=>i===0||r.top>=blocks[i-1].bottom-5);
                                }"""),(engine,width,'Work sections must read top to bottom')
                            search=page.locator('[data-lab-project-search]')
                            search.fill('Merit')
                            assert page.locator('[data-lab-project]:visible').count()==1
                            search.fill('zz-no-project')
                            assert page.locator('[data-lab-project]:visible').count()==0
                            assert 'No matching' in page.locator('[data-lab-project-count]').inner_text()
                            search.fill('')
                            assert page.locator('[data-lab-project]:visible').count()>4
                            stage=page.locator('[data-lab-project-stage]')
                            stage.select_option('experimental')
                            assert page.locator('[data-lab-project]:visible').count()>0
                            assert page.locator('[data-lab-project]:visible:not([data-stage="experimental"])').count()==0
                            stage.select_option('all')
                        if width in (390,1536): page.screenshot(path=str(OUT/f'{engine}-{key}-{width}.png'),full_page=True)
                        navigate(page,'home',width)
                        assert page.title()=='Devon Alan Akins — CEO, Software Engineering & Research', (engine,width,'Homepage title must survive tab navigation')
                    # Real source details independently expand and retain their provenance.
                    for card in page.locator('.lab-signal-tile').all():
                        card.locator('summary').click()
                        assert card.get_attribute('open') is not None
                        card.locator('summary').click()
                    # Historical routes remain reachable but are not primary tabs.
                    for route,key in (('/systems/','systems'),('/portfolio/','portfolio'),('/fieldnotes/','writing'),('/activity/','activity'),('/contact/','contact')):
                        page.goto(BASE+route,wait_until='networkidle')
                        assert page.locator(f'[data-one-view="{key}"]').is_visible(),(engine,width,route)
                        if key=='writing':
                            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(engine,width,route,'Writing layout overflow')
                    page.goto(BASE,wait_until='networkidle')
                    page.locator('.lab-menu-toggle' if width<=1100 else '.lab-desktop-menu').click()
                    motion=page.locator('#lab-menu [data-lab-motion]')
                    if width==375: assert motion.is_disabled()
                    else:
                        motion.click()
                        assert motion.get_attribute('aria-pressed')=='false'
                        motion.click()
                    page.locator('[data-lab-menu-close]').click()
                    if width in (390,1536):
                        for key in ('home','work','experience'):
                            navigate(page,key,width)
                            page.evaluate(Path('node_modules/axe-core/axe.min.js').read_text())
                            violations=page.evaluate("""async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))""")
                            (OUT/f'{engine}-axe-{key}-{width}.json').write_text(json.dumps(violations,indent=2))
                            assert not [v for v in violations if v['impact'] in ('serious','critical')],(engine,width,key,violations)
                        navigate(page,'home',width)
                    assert not private_feed_requests,(engine,width,private_feed_requests)
                    assert not errors,(engine,width,errors)
                    context.close()
                # Failure of decorative image loading must leave readable, operable content.
                fallback=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':390,'height':844},reduced_motion='reduce')
                fallback.route('**/professional/cinematic/**',lambda route:route.abort())
                sample=fallback.new_page();sample.goto(BASE,wait_until='networkidle')
                assert sample.locator('.lab-portfolio-hero h1').is_visible()
                sample.locator('[data-lab-destination="experience"]').click()
                sample.locator('.da-sketch > summary').click()
                assert sample.locator('[data-lab-axis="a"]').is_visible()
                fallback.close()
                context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':390,'height':844},java_script_enabled=False)
                page=context.new_page();page.goto(BASE,wait_until='networkidle')
                assert page.locator('.lab-portfolio-hero h1').is_visible()
                for key in ('systems','portfolio','writing','contact'): assert page.locator(f'[data-one-view="{key}"]').is_visible()
                page.screenshot(path=str(OUT/f'{engine}-nojs.png'),full_page=True)
                context.close()
                # System preference, live OS changes, persistent manual override and
                # both menu controls are verified in each supported browser engine.
                theme_context=browser.new_context(ignore_https_errors=LOCAL_TLS,
                    viewport={'width':390,'height':844},color_scheme='dark')
                theme_page=theme_context.new_page()
                theme_page.goto(BASE,wait_until='networkidle')
                assert theme_page.locator('html').get_attribute('data-theme')=='dark'
                assert theme_page.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(12, 17, 26)'
                theme_page.emulate_media(color_scheme='light')
                assert not theme_page.evaluate("matchMedia('(prefers-color-scheme: dark)').matches")
                wait_for_condition(theme_page,"document.documentElement.dataset.theme==='light'")
                theme_page.emulate_media(color_scheme='dark')
                wait_for_condition(theme_page,"document.documentElement.dataset.theme==='dark'")
                theme_page.locator('.lab-menu-toggle').click()
                theme_picker=theme_page.locator('#lab-menu [data-lab-theme-select]')
                assert theme_picker.input_value()=='system'
                theme_picker.select_option('light')
                assert theme_page.locator('html').get_attribute('data-theme')=='light'
                assert theme_page.evaluate("localStorage.getItem('devonakins.appearance.v1')")=='light'
                theme_page.reload(wait_until='networkidle')
                assert theme_page.locator('html').get_attribute('data-theme')=='light'
                theme_page.locator('.lab-menu-toggle').click()
                theme_picker=theme_page.locator('#lab-menu [data-lab-theme-select]')
                assert theme_picker.input_value()=='light'
                theme_picker.select_option('system')
                assert theme_page.locator('html').get_attribute('data-theme')=='dark'
                assert theme_page.evaluate("localStorage.getItem('devonakins.appearance.v1')") is None
                theme_context.close()
                desktop_theme=browser.new_context(ignore_https_errors=LOCAL_TLS,
                    viewport={'width':1536,'height':900},color_scheme='light')
                desktop_page=desktop_theme.new_page()
                desktop_page.goto(BASE,wait_until='networkidle')
                desktop_picker=desktop_page.locator('.lab-header-end [data-lab-theme-select]')
                assert desktop_picker.is_visible()
                desktop_picker.select_option('dark')
                assert desktop_page.locator('html').get_attribute('data-theme')=='dark'
                desktop_page.locator('.lab-desktop-menu').click()
                assert desktop_page.locator('#lab-menu [data-lab-theme-select]').input_value()=='dark'
                desktop_theme.close()
            finally: browser.close()
    print('Cinematic acceptance passed: Chromium/WebKit, 10 viewports, three primary destinations, two public source cards, historical direct links, no editor/Threads feed requests, modal/Escape/focus, project search, analytic model, reduced motion, no-JS and WCAG audit.')
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
