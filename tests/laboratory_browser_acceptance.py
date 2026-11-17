"""Approved cinematic composition: independent DOM, truthful sources and real browsers."""
import json
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4179'
OUT = Path('browser-qa/laboratory')
OUT.mkdir(parents=True, exist_ok=True)
SIZES = ((320,568),(375,667),(390,844),(393,852),(428,926),(768,1024),
         (1024,768),(1440,900),(1536,864),(1920,1080))
server = subprocess.Popen(['./node_modules/.bin/vite','preview','--host','127.0.0.1','--port','4179','--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)

def navigate(page,key,width):
    if width<=760:
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
    for _ in range(100):
        try:
            urllib.request.urlopen(BASE,timeout=1).close()
            break
        except Exception:
            if server.poll() is not None: raise AssertionError('Preview exited')
            time.sleep(.2)
    else: raise AssertionError('Preview unavailable')
    with sync_playwright() as pw:
        for engine in ('chromium','webkit'):
            browser=getattr(pw,engine).launch()
            try:
                for width,height in SIZES:
                    context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if width==375 else 'no-preference')
                    page=context.new_page()
                    errors=[]
                    page.on('pageerror',lambda error:errors.append(str(error)))
                    page.goto(BASE,wait_until='networkidle')
                    assert page.title()=='Devon Alan Akins — Software, Systems & Research'
                    assert 'Research & Engineering' in page.locator('.lab-portfolio-hero h1').inner_text()
                    assert page.locator('.lab-hero-name').inner_text()=='DEVON ALAN AKINS'
                    assert page.locator('.lab-destination').count()==5
                    assert page.locator('.lab-signal-tile').count()==4
                    assert page.locator('[data-one-view]').count()==8
                    assert page.locator('[data-public-github-feed]').count()==2
                    assert page.locator('[data-public-work][data-work-presentation="editor"]').count()==1
                    assert page.locator('[data-public-spotify]').count()==1
                    assert page.locator('[data-public-threads]').count()==2
                    assert page.locator('[data-public-gpt],a[href="/gpt/"]').count()==0
                    assert page.locator('.lab-tabs-desktop [data-one-target]').count()==6
                    assert page.locator('.lab-footer .one-social-icon').count()==4
                    assert page.locator('.lab-scene img').evaluate('el=>el.complete&&el.naturalWidth>500')
                    geometry=page.evaluate('''() => {
                      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
                      return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,header:rect('.lab-header'),hero:rect('.lab-portfolio-hero'),signals:rect('.lab-portfolio-signals'),destinations:rect('.lab-destinations'),footer:rect('.lab-footer'),cards:[...document.querySelectorAll('.lab-destination')].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})),signalCards:[...document.querySelectorAll('.lab-signal-tile')].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}))};}''')
                    assert geometry['scroll']<=width+1,(engine,width,geometry)
                    assert geometry['signals']['y']<geometry['destinations']['y']<geometry['footer']['y']
                    if width<=760:
                        assert page.locator('.lab-tabs-desktop').is_hidden()
                        assert page.locator('.lab-menu-toggle').is_visible()
                        assert len(set(round(c['x']) for c in geometry['cards']))==1
                        assert len(set(round(c['y']) for c in geometry['cards']))==5
                        assert len(set(round(c['x']) for c in geometry['signalCards']))==2
                        assert len(set(round(c['y']) for c in geometry['signalCards']))==2
                        assert page.evaluate("getComputedStyle(document.body).overflowY")!='hidden'
                        page.locator('.lab-menu-toggle').click()
                        assert page.locator('#lab-menu').is_visible()
                        page.keyboard.press('Escape')
                        assert page.locator('#lab-menu').is_hidden()
                        page.wait_for_function("document.querySelector('.lab-menu-toggle').getAttribute('aria-expanded')==='false'")
                        assert page.evaluate("document.activeElement.hasAttribute('data-lab-menu-open')")
                    else:
                        assert page.locator('.lab-tabs-desktop').is_visible()
                    if width==1536:
                        # Reference landmarks: header 60, signal strip ~498, destinations ~600.
                        assert abs(geometry['header']['height']-60)<=5
                        assert abs(geometry['signals']['y']-498)<=35
                        assert abs(geometry['destinations']['y']-600)<=40
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
                    page.locator('.lab-menu-toggle' if width<=760 else '.lab-desktop-menu').click()
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
                            page.add_script_tag(path='node_modules/axe-core/axe.min.js')
                            violations=page.evaluate("""async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))""")
                            (OUT/f'{engine}-axe-{key}-{width}.json').write_text(json.dumps(violations,indent=2))
                            assert not [v for v in violations if v['impact'] in ('serious','critical')],(engine,width,key,violations)
                        navigate(page,'home',width)
                    assert not errors,(engine,width,errors)
                    context.close()
                # Synthetic fixtures exercise privacy semantics only; no fixture screenshots are published.
                import datetime
                for source,age_seconds,expected in (('owner-declared',0,'NO VERIFIED EDITOR'),('editor-heartbeat',0,'EDITOR OBSERVED'),('editor-heartbeat',600,'NO VERIFIED EDITOR')):
                    fixture=browser.new_context(viewport={'width':390,'height':844})
                    now=datetime.datetime.now(datetime.timezone.utc)
                    stamp=now.isoformat(timespec='milliseconds').replace('+00:00','Z')
                    observed=(now-datetime.timedelta(seconds=age_seconds)).isoformat(timespec='milliseconds').replace('+00:00','Z')
                    fixture.route('**/api/listening/now',lambda route:route.fulfill(json={'version':1,'mode':'playing','detailsVisible':False,'updatedAt':stamp}))
                    snapshot={'version':4,'asOf':stamp,'work':{'visibility':'public','state':'developing','source':source,'asOf':observed}}
                    fixture.route('**/api/activity/v4',lambda route:route.fulfill(json=snapshot))
                    sample=fixture.new_page();sample.goto(BASE,wait_until='networkidle')
                    sample.wait_for_function("document.querySelector('[data-work-state]').textContent === "+json.dumps(expected))
                    assert sample.locator('[data-public-work]').get_attribute('data-work-mode')==('active' if expected=='EDITOR OBSERVED' else 'idle')
                    fixture.close()
                # Failure of decorative image loading must leave readable, operable content.
                fallback=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
                fallback.route('**/professional/cinematic/**',lambda route:route.abort())
                sample=fallback.new_page();sample.goto(BASE,wait_until='networkidle')
                assert sample.locator('.lab-portfolio-hero h1').is_visible()
                sample.locator('[data-lab-destination="experience"]').click()
                assert sample.locator('[data-lab-axis="a"]').is_visible()
                fallback.close()
                context=browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False)
                page=context.new_page();page.goto(BASE,wait_until='networkidle')
                assert page.locator('.lab-portfolio-hero h1').is_visible()
                for key in ('systems','portfolio','writing','contact'): assert page.locator(f'[data-one-view="{key}"]').is_visible()
                page.screenshot(path=str(OUT/f'{engine}-nojs.png'),full_page=True)
                context.close()
            finally: browser.close()
    print('Cinematic acceptance passed: Chromium/WebKit, 10 viewports, eight views, five destinations, modal/Escape/focus, source disclosures, project search, analytic model, reduced motion, no-JS, WCAG audit and landmark checks.')
finally:
    server.terminate()
    try:server.wait(timeout=10)
    except subprocess.TimeoutExpired:server.kill();server.wait()
