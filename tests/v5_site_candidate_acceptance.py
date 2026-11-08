#!/usr/bin/env python3
"""Full-site candidate through the actual local Worker. No live provider access."""
import argparse,json,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ROUTES=['/','/signal-field/','/work/','/writing/','/research/','/knowledge/','/knowledge/sources-and-meaning/','/knowledge/public-and-private/','/knowledge/replaying-a-record/','/about/','/work/mizvo/']
VIEWS=[(1199,1312),(1440,900),(1280,800),(1024,768),(390,844),(375,667),(320,568)]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True);parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium');parser.add_argument('--chromium-executable');parser.add_argument('--constrained',action='store_true');args=parser.parse_args()
    origin=args.origin.rstrip('/');out=ROOT/'.artifacts/v5-site-candidate';out.mkdir(parents=True,exist_ok=True)
    for _ in range(120):
        try: urllib.request.urlopen(origin+'/_health',timeout=1).close();break
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
                context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');page=context.new_page();errors=[];blocked=[]
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
                    if path in ['/','/signal-field/','/knowledge/sources-and-meaning/']:
                        page.screenshot(path=str(out/f'{args.engine}-{width}-{path.strip("/").replace("/","-") or "home"}.png'),full_page=True,animations='disabled',timeout=20000)
                page.goto(origin+'/work/',wait_until='networkidle');page.locator('[data-v5-project-search]').fill('Mizvo')
                assert page.locator('[data-v5-project-card]:visible').count()==1
                page.locator('[data-v5-project-search]').fill('NO_MATCH_XYZ')
                assert page.locator('[data-v5-project-empty]').is_visible()
                page.goto(origin+'/knowledge/',wait_until='networkidle');page.locator('a[href="/knowledge/sources-and-meaning/"]').first.click();assert page.locator('h1').inner_text()=='What a live signal actually means'
                page.locator('a[href="/knowledge/public-and-private/"]').first.click();assert 'Publishing a view' in page.locator('h1').inner_text()
                assert not errors,(width,errors);assert not blocked,blocked
                records.append({'engine':args.engine,'viewport':[width,height],'routes':len(ROUTES),'result':'pass'});context.close()
                if args.constrained: browser.close();browser=getattr(p,args.engine).launch(**options)
            context=browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False);page=context.new_page()
            response=page.goto(origin+'/signal-field/');assert 'no-store' in response.headers['cache-control'];assert "form-action 'self'" in response.headers['content-security-policy']
            page.locator('#v5-graph-date').fill('2026-11-06')
            with page.expect_navigation():page.locator('.v5-graph-date-form button').click()
            assert 'asOf=2026-11-06' in page.url;assert page.locator('#v5-graph-date').input_value()=='2026-11-06'
            assert page.locator('[data-v5-atlas-at]').get_attribute('data-v5-atlas-at')=='2026-11-06T23:59:59.999Z'
            page.locator('[data-v5-atlas-node-id="project:mizvo"] summary').click();assert page.locator('[data-v5-atlas-node-id="project:mizvo"]').get_attribute('open') is not None
            page.goto(origin+'/knowledge/');page.locator('a[href="/knowledge/sources-and-meaning/"]').first.click();assert page.locator('h1').is_visible();context.close()
        finally:browser.close()
    (out/f'{args.engine}-report.json').write_text(json.dumps(records,indent=2))
    print(f'{args.engine}: {len(records)} viewport cases, {len(ROUTES)} routes each, WCAG, search, backlinks and actual Worker no-JS date navigation passed.')
if __name__=='__main__':main()
