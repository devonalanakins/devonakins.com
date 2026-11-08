#!/usr/bin/env python3
"""Full-site candidate through the actual local Worker. No live provider access."""
import argparse,json,ssl,time,urllib.request
from datetime import datetime,timedelta,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ROUTES=['/','/signal-field/','/work/','/writing/','/research/','/knowledge/','/knowledge/sources-and-meaning/','/knowledge/public-and-private/','/knowledge/replaying-a-record/','/about/','/work/mizvo/']
VIEWS=[(1199,1312),(1440,900),(1280,800),(1024,768),(390,844),(375,667),(320,568)]

def check_atlas_live_evidence(browser, origin, local_tls):
    """Synthetic public V4 fixtures through the compiled full atlas; no provider access."""
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce',
                                ignore_https_errors=local_tls is not None)
    page=context.new_page();mode={'value':'active'};calls=[];errors=[];blocked=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def stamp(offset=0):
        return (datetime.now(timezone.utc)+timedelta(seconds=offset)).isoformat(
            timespec='milliseconds').replace('+00:00','Z')
    def route(r):
        url=r.request.url
        if url==origin+'/api/activity/v4':
            calls.append(mode['value'])
            if mode['value']=='unavailable':
                r.fulfill(status=503,content_type='application/json',body='{}')
                return
            active=mode['value']=='active'
            snapshot={
                'version':4,'asOf':stamp(),
                'work':({'version':1,'visibility':'public','source':'editor-heartbeat',
                         'project':'Mizvo','state':'developing','asOf':stamp(-6)}
                        if active else {'visibility':'hidden','state':'not-broadcasting'}),
                'remote':({'visibility':'public','tasks':[{
                    'source':'codex','project':'Merit','state':'running','checkpoint':None,
                    'asOf':stamp(-8),'expiresAt':stamp(92)}]}
                    if active else {'visibility':'hidden','tasks':[]}),
                'recent':[],
            }
            r.fulfill(status=200,content_type='application/json',body=json.dumps(snapshot))
        elif '/api/' in url:
            r.fulfill(status=200,content_type='application/json',body='{}')
        elif not url.startswith(origin+'/'):
            blocked.append(url);r.abort()
        else:r.continue_()
    page.route('**/*',route)
    try:
        assert page.goto(origin+'/signal-field/',wait_until='networkidle').status==200
        assert page.locator('[data-v5-atlas-node-id]').count()==12
        assert page.locator('[data-v5-atlas-revision]').get_attribute('data-v5-atlas-revision')=='8'
        page.wait_for_function("""() =>
            document.querySelector('[data-v5-atlas-node-id="project:mizvo"]')
              ?.dataset.v5AtlasLiveKind === 'editor' &&
            document.querySelector('[data-v5-atlas-node-id="project:merit"]')
              ?.dataset.v5AtlasLiveKind === 'remote'""",timeout=10000)
        assert '2 fresh' in page.locator('[data-v5-atlas-live-status]').inner_text()
        assert page.locator('[data-v5-atlas-live-list] li').count()==2
        assert page.locator('[data-v5-atlas-live-list]').inner_text().find('Codex task')>=0
        assert page.locator('[data-v5-atlas-node-id="section:knowledge-overview"]').get_attribute(
            'data-v5-atlas-live-kind') is None
        # BFCache suspension must immediately clear previously painted
        # activity, even before a network request resolves. The semantic
        # structures remain; only transient evidence is suppressed.
        page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))")
        assert page.locator('[data-v5-atlas-node-id="project:mizvo"]').get_attribute('data-v5-atlas-live-kind') is None
        assert page.locator('[data-v5-atlas-node-id="project:merit"]').get_attribute('data-v5-atlas-live-kind') is None
        assert page.locator('[data-v5-atlas-live-list] li').count()==0
        assert 'unavailable' in page.locator('[data-v5-atlas-live-status]').inner_text()
        assert page.locator('[data-v5-atlas-node-id]').count()==12
        assert page.locator('[data-v5-atlas-revision]').get_attribute('data-v5-atlas-revision')=='8'
        # Resuming against a now-private provider must never resurrect
        # stale paint while awaiting the new consent-filtered response.
        mode['value']='private'
        page.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
        page.wait_for_function("""() =>
            !document.querySelector('[data-v5-atlas-node-id="project:mizvo"]')
              ?.hasAttribute('data-v5-atlas-live-kind') &&
            !document.querySelector('[data-v5-atlas-node-id="project:merit"]')
              ?.hasAttribute('data-v5-atlas-live-kind')""",timeout=10000)
        assert page.locator('[data-v5-atlas-live-list] li').count()==0
        assert 'No fresh' in page.locator('[data-v5-atlas-live-status]').inner_text()
        # Source errors must remain unavailable, never relight a stale project.
        mode['value']='unavailable'
        page.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
        page.wait_for_function("""() =>
            document.querySelector('[data-v5-atlas-live-status]')
              ?.textContent.includes('unavailable')""",timeout=10000)
        assert not page.locator('[data-v5-atlas-live-list] li').count()
        assert calls.count('active')>=1 and calls.count('private')>=1 and calls.count('unavailable')>=1,calls
        # Explicit reauthorization is allowed to restore fresh current
        # evidence; the reset is not a permanent disable switch.
        mode['value']='active'
        page.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
        page.wait_for_function("""() =>
            document.querySelector('[data-v5-atlas-node-id="project:mizvo"]')
              ?.dataset.v5AtlasLiveKind === 'editor' &&
            document.querySelector('[data-v5-atlas-node-id="project:merit"]')
              ?.dataset.v5AtlasLiveKind === 'remote'""",timeout=10000)
        assert page.locator('[data-v5-atlas-live-list] li').count()==2
        assert not errors,errors
        assert not blocked,blocked
    finally:context.close()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True);parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium');parser.add_argument('--chromium-executable');parser.add_argument('--constrained',action='store_true');args=parser.parse_args()
    origin=args.origin.rstrip('/')
    if not origin.startswith(('http://127.0.0.1:','https://127.0.0.1:','http://localhost:','https://localhost:')):
        raise AssertionError('Candidate browser acceptance must use a loopback Worker')
    local_tls = ssl._create_unverified_context() if origin.startswith('https://') else None
    out=ROOT/'.artifacts/v5-site-candidate';out.mkdir(parents=True,exist_ok=True)
    for _ in range(120):
        try: urllib.request.urlopen(origin+'/_health',timeout=1,context=local_tls).close();break
        except OSError: time.sleep(.5)
    else: raise AssertionError('Local Worker failed to start')
    records=[];axe=(ROOT/'node_modules/axe-core/axe.min.js').read_text()
    with sync_playwright() as p:
        options={}
        if args.chromium_executable: options['executable_path']=args.chromium_executable
        if args.constrained: options['args']=['--single-process','--no-zygote','--no-sandbox']
        browser=getattr(p,args.engine).launch(**options)
        try:
            for width,height in VIEWS:
                context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',
                                            ignore_https_errors=local_tls is not None);page=context.new_page();errors=[];blocked=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                def route(r):
                    if '/api/' in r.request.url: r.fulfill(status=200,content_type='application/json',body='{}')
                    elif not r.request.url.startswith(origin+'/'): blocked.append(r.request.url);r.abort()
                    else:r.continue_()
                page.route('**/*',route)
                for path in ROUTES:
                    response=page.goto(origin+path,wait_until='networkidle');assert response.status==200,path
                    assert page.locator('h1').count()==1,path
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,path,'overflow')
                    assert not page.locator('a[href*="/__v5_preview__/"]').count(),path
                    page.evaluate(axe)
                    violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
                    if violations and args.engine == 'webkit':
                        # WebKit occasionally reports target-size violations that
                        # Chromium does not. Capture actual geometry and the
                        # elements at each target centre before changing CSS;
                        # never exempt the failures from acceptance.
                        diagnostics = page.evaluate("""() => {
                          const selectors = ['.v5-skip','.v5-brand',
                            '.v5-desktop-nav a','.v5-locked-session-link',
                            '.v5-lock-field-cta','.v5-footer > a'];
                          return Object.fromEntries(selectors.map(sel => {
                            const node = document.querySelector(sel);
                            if (!node) return [sel,null];
                            const r = node.getBoundingClientRect(),
                              style = getComputedStyle(node),
                              x = r.left+r.width/2, y = r.top+r.height/2;
                            const hit = document.elementFromPoint(x,y);
                            return [sel,{rect:{x:r.x,y:r.y,width:r.width,height:r.height},
                              hit:hit?.tagName+'.'+String(hit?.className||'').slice(0,100),
                              contained:node===hit||node.contains(hit),
                              display:style.display, visibility:style.visibility,
                              pointerEvents:style.pointerEvents,
                              transform:style.transform}];
                          }));
                        }""")
                        resources = page.evaluate("""() => ({
                          links:[...document.querySelectorAll('link[rel="stylesheet"]')].map(n=>({
                            href:n.href,media:n.media,disabled:n.disabled,
                            hasSheet:!!n.sheet,
                          })),
                          sheets:[...document.styleSheets].map(s=>({
                            href:s.href,disabled:s.disabled,
                            rules:(()=>{try{return s.cssRules.length}catch{return 'unavailable'}})(),
                          })),
                          css:[...performance.getEntriesByType('resource')]
                            .filter(r=>/\\.css(?:[?#]|$)/.test(r.name))
                            .map(r=>({name:r.name,status:r.responseStatus,
                                      duration:r.duration,bytes:r.transferSize})),
                        })""")
                        print("WebKit stylesheet diagnostics:",json.dumps(resources,sort_keys=True),flush=True)
                        print("WebKit target diagnostics:",json.dumps(diagnostics,sort_keys=True),flush=True)
                    assert not violations,(width,path,violations)
                    visual_reference_routes=['/','/signal-field/','/knowledge/sources-and-meaning/']
                    secondary_visual_routes=['/work/','/research/','/writing/','/about/']
                    if path in visual_reference_routes or (
                        width in (320,390,1199) and path in secondary_visual_routes
                    ):
                        page.screenshot(path=str(out/f'{args.engine}-{width}-{path.strip("/").replace("/","-") or "home"}.png'),full_page=True,animations='disabled',timeout=20000)
                page.goto(origin+'/work/',wait_until='networkidle')
                search=page.locator('[data-v5-project-search]')
                category=page.locator('[data-v5-project-category]')
                search.fill('Mizvo')
                assert page.locator('[data-v5-project-card]:visible').count()==1
                search.fill('')
                for kind, expected in [
                    ('archive','Vesper Legacy'),('writing','Books & writing'),
                    ('operations','Business operations'),
                ]:
                    category.select_option(kind)
                    cards=page.locator('[data-v5-project-card]:visible')
                    assert cards.count()==1,(kind,cards.count())
                    assert expected in cards.first.inner_text(),(kind,expected)
                category.select_option('')
                search.fill('NO_MATCH_XYZ')
                assert page.locator('[data-v5-project-empty]').is_visible()
                page.goto(origin+'/knowledge/',wait_until='networkidle')
                with page.expect_navigation(url="**/knowledge/sources-and-meaning/", wait_until="domcontentloaded"):
                    page.locator('a[href="/knowledge/sources-and-meaning/"]').first.click()
                assert page.locator('h1').inner_text()=='What an activity record actually means'
                with page.expect_navigation(url="**/knowledge/public-and-private/", wait_until="domcontentloaded"):
                    page.locator('a[href="/knowledge/public-and-private/"]').first.click()
                assert page.locator('h1').inner_text()=='Publishing a view, keeping a boundary'
                assert not errors,(width,errors);assert not blocked,blocked
                records.append({'engine':args.engine,'viewport':[width,height],'routes':len(ROUTES),'result':'pass'});context.close()
                if args.constrained: browser.close();browser=getattr(p,args.engine).launch(**options)
            context=browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False,
                                        ignore_https_errors=local_tls is not None);page=context.new_page()
            response=page.goto(origin+'/signal-field/');assert 'no-store' in response.headers['cache-control'];assert "form-action 'self'" in response.headers['content-security-policy']
            page.locator('#v5-graph-date').fill('2026-11-06')
            with page.expect_navigation():page.locator('.v5-graph-date-form button').click()
            assert 'asOf=2026-11-06' in page.url;assert page.locator('#v5-graph-date').input_value()=='2026-11-06'
            assert page.locator('[data-v5-atlas-at]').get_attribute('data-v5-atlas-at')=='2026-11-06T23:59:59.999Z'
            assert page.locator('[data-v5-atlas-revision]').get_attribute('data-v5-atlas-revision')=='8'
            assert page.locator('[data-v5-atlas-node-id]').count()==12
            # Before any source-merge date, archived public structure is empty.
            page.goto(origin+'/signal-field/?asOf=2026-11-03')
            assert page.locator('[data-v5-atlas-revision]').get_attribute('data-v5-atlas-revision')=='0'
            assert page.locator('[data-v5-atlas-node-id]').count()==8
            assert page.locator('.v5-graph-node').count()==8
            page.locator('[data-v5-atlas-node-id="project:mizvo"] summary').click();assert page.locator('[data-v5-atlas-node-id="project:mizvo"]').get_attribute('open') is not None
            page.goto(origin+'/knowledge/');page.locator('a[href="/knowledge/sources-and-meaning/"]').first.click();assert page.locator('h1').is_visible();context.close()
            check_atlas_live_evidence(browser,origin,local_tls)
        finally:browser.close()
    (out/f'{args.engine}-report.json').write_text(json.dumps(records,indent=2))
    print(f'{args.engine}: {len(records)} viewport cases, {len(ROUTES)} routes each, WCAG, search, backlinks and actual Worker no-JS date navigation passed.')
if __name__=='__main__':main()
