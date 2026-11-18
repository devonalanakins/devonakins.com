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
                    assert page.title()=='Devon Alan Akins — Software, Systems & Research'
                    assert 'Research & Engineering' in page.locator('.lab-portfolio-hero h1').inner_text()
                    assert page.locator('.lab-hero-name').inner_text()=='DEVON ALAN AKINS'
                    assert page.locator('.lab-destination').count()==5
                    assert page.locator('.lab-signal-tile').count()==2
                    assert page.locator('[data-one-view]').count()==8
                    assert page.locator('[data-public-github-feed]').count()==2
                    assert page.locator('[data-public-work]').count()==0
                    assert page.locator('[data-public-spotify]').count()==1
                    assert page.locator('[data-public-threads]').count()==0
                    assert page.locator('.lab-footer .one-social-icon--threads').count()==1
                    assert page.locator('.lab-explore-heading').count()==1
                    assert page.locator('[data-public-gpt],a[href="/gpt/"]').count()==0
                    assert page.locator('.lab-tabs-desktop [data-one-target]').count()==6
                    assert page.locator('.lab-footer .one-social-icon').count()==4
                    assert page.locator('.lab-scene img').evaluate('el=>el.complete&&el.naturalWidth>500')
                    if urlparse(BASE).hostname in ('127.0.0.1','localhost','::1'):
                        assert page.locator('[data-lab-scene-canvas]').count()==1
                        # Prevent a silent regression to the image-only candidate.
                        webgl_supported=page.evaluate("() => !!document.createElement('canvas').getContext('webgl2')")
                        if webgl_supported:
                            wait_for_condition(page,"document.querySelector('.lab-portfolio-hero').classList.contains('lab-cinematic-ready')")
                            assert page.locator('[data-lab-scene-canvas]').is_visible()
                        else:
                            assert page.locator('.lab-scene img').is_visible()
                        if width==1536 and webgl_supported:
                            card=page.locator('[data-lab-destination="experience"]')
                            card.hover(position={'x':80,'y':40})
                            wait_for_condition(page,"!!document.querySelector('[data-lab-destination=\"experience\"]').style.getPropertyValue('--lab-card-rotate-y')")
                            page.mouse.move(1,1)
                            wait_for_condition(page,"!document.querySelector('[data-lab-destination=\"experience\"]').style.getPropertyValue('--lab-card-rotate-y')")
                    geometry=page.evaluate('''() => {
                      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
                      return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,header:rect('.lab-header'),hero:rect('.lab-portfolio-hero'),signals:rect('.lab-portfolio-signals'),explore:rect('.lab-explore-heading'),destinations:rect('.lab-destinations'),footer:rect('.lab-footer'),cards:[...document.querySelectorAll('.lab-destination')].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})),signalCards:[...document.querySelectorAll('.lab-signal-tile')].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}))};}''')
                    assert geometry['scroll']<=width+1,(engine,width,geometry)
                    assert geometry['hero']['bottom']<=geometry['signals']['y']+3
                    assert geometry['signals']['bottom']<=geometry['explore']['y']+3
                    assert geometry['explore']['bottom']<=geometry['destinations']['y']+3
                    assert geometry['destinations']['y']<geometry['footer']['y']
                    if width<=760:
                        assert page.locator('.lab-tabs-desktop').is_hidden()
                        assert page.locator('.lab-menu-toggle').is_visible()
                        assert len(set(round(c['x']) for c in geometry['cards']))==1
                        assert len(set(round(c['y']) for c in geometry['cards']))==5
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
                        assert abs(geometry['header']['height']-62)<=8
                        assert geometry['destinations']['y']-geometry['signals']['y']>=100
                    (OUT/f'{engine}-landmarks-{width}.json').write_text(json.dumps(geometry,indent=2))
                    page.mouse.click(width-2,65)
                    page.screenshot(path=str(OUT/f'{engine}-cinematic-{width}x{height}.png'),full_page=True)
                    for key in ('experience','systems','work','portfolio','writing'):
                        page.locator(f'[data-lab-destination="{key}"]').click()
                        assert page.locator(f'[data-one-view="{key}"]').is_visible()
                        assert page.evaluate('document.activeElement.dataset.oneView')==key
                        if key=='experience':
                            curve=page.locator('[data-lab-curve="interactive"]')
                            before=curve.get_attribute('d')
                            page.locator('[data-lab-axis="a"]').fill('5')
                            assert curve.get_attribute('d')!=before
                            assert 'a = 5' in page.locator('[data-lab-model-caption]').inner_text()
                        if key=='work':
                            search=page.locator('[data-lab-project-search]')
                            search.fill('Merit')
                            assert page.locator('[data-lab-project]:visible').count()==1
                            search.fill('zz-no-project')
                            assert page.locator('[data-lab-project]:visible').count()==0
                            assert 'No matching' in page.locator('[data-lab-project-count]').inner_text()
                            search.fill('')
                            assert page.locator('[data-lab-project]:visible').count()>4
                        if width in (390,1536): page.screenshot(path=str(OUT/f'{engine}-{key}-{width}.png'),full_page=True)
                        navigate(page,'home',width)
                    # Real source details independently expand and retain their provenance.
                    for card in page.locator('.lab-signal-tile').all():
                        card.locator('summary').click()
                        assert card.get_attribute('open') is not None
                        card.locator('summary').click()
                    for key in ('activity','contact'):
                        navigate(page,key,width)
                        navigate(page,'home',width)
                    page.locator('.lab-menu-toggle' if width<=1100 else '.lab-desktop-menu').click()
                    motion=page.locator('#lab-menu [data-lab-motion]')
                    if width==375: assert motion.is_disabled()
                    else:
                        motion.click()
                        assert motion.get_attribute('aria-pressed')=='false'
                        motion.click()
                    page.locator('[data-lab-menu-close]').click()
                    if width in (390,1536):
                        for key in ('home','experience','systems','work','portfolio','writing','activity','contact'):
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
                assert sample.locator('[data-lab-axis="a"]').is_visible()
                fallback.close()
                context=browser.new_context(ignore_https_errors=LOCAL_TLS,viewport={'width':390,'height':844},java_script_enabled=False)
                page=context.new_page();page.goto(BASE,wait_until='networkidle')
                assert page.locator('.lab-portfolio-hero h1').is_visible()
                for key in ('systems','portfolio','writing','contact'): assert page.locator(f'[data-one-view="{key}"]').is_visible()
                page.screenshot(path=str(OUT/f'{engine}-nojs.png'),full_page=True)
                context.close()
            finally: browser.close()
    print('Cinematic acceptance passed: Chromium/WebKit, 10 viewports, eight views, five destinations, two public source cards, no editor/Threads feed requests, modal/Escape/focus, project search, analytic model, reduced motion, no-JS and WCAG audit.')
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
