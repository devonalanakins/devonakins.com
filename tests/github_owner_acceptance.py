#!/usr/bin/env python3
"""Synthetic private inventory UI; no GitHub credentials or external requests."""
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
html=subprocess.check_output(['node','--input-type=module','-e',"import {renderGithubIntegrationOwner} from './src/github-integration-page.mjs'; process.stdout.write(renderGithubIntegrationOwner());"],cwd=ROOT,text=True)
with sync_playwright() as p:
    for engine in [p.chromium,p.webkit]:
        browser=engine.launch()
        for width in [320,390,1440]:
            context=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce')
            page=context.new_page()
            state={'enabled':False,'posts':[]}
            inventory=[{'id':101,'fullName':'devonalanakins/merit','private':False,'authorized':True,'recognizedProject':'merit','approved':False,'connected':False,'sharing':False,'revision':0},
                {'id':202,'fullName':'devonalanakins/private-fixture-<script>','private':True,'authorized':True,'approved':False,'connected':False,'sharing':False,'revision':0}]
            def route(r):
                path=r.request.url.split('example.test',1)[-1]
                if path=='/owner/github/':return r.fulfill(body=html,content_type='text/html')
                if path.startswith('/v2/'):
                    file=ROOT/'public'/path.lstrip('/')
                    return r.fulfill(body=file.read_text(),content_type='text/css' if file.suffix=='.css' else 'text/javascript')
                if path=='/api/presence/owner?channel=github':
                    if r.request.method=='POST':
                        state['posts'].append(r.request.post_data_json)
                        return r.fulfill(json={'saved':True})
                    return r.fulfill(json={'version':1,'enabled':state['enabled'],'configured':state['enabled'],'repositories':inventory if state['enabled'] else []})
                return r.abort()
            page.route('**/*',route)
            page.goto('https://example.test/owner/github/')
            page.wait_for_function("document.querySelector('#github-readiness').textContent.includes('disabled')")
            assert page.locator('#github-discover').is_disabled()
            assert page.locator('.github-repository').count()==0
            state['enabled']=True
            page.locator('#github-reload').click()
            page.wait_for_function("document.querySelectorAll('.github-repository').length===2")
            assert page.locator('.github-repository select').count()==1
            assert page.locator('.github-sharing input').is_checked()==False
            assert page.locator('.github-repository script').count()==0
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(engine.name,width)
            page.locator('button',has_text='Connect this repository').click()
            page.wait_for_function("document.querySelector('#github-status').textContent==='Connection settings saved.'")
            assert state['posts']==[{'action':'connect','id':101,'revision':0,'projectSlug':'merit','enabled':False}]
            page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
            violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
            assert not violations,[(v['id'],[n['target'] for n in v['nodes']]) for v in violations]
            context.close()
        browser.close()
print('Private repository UI: disabled gate, explicit classification without sharing, private exclusion, escaping and responsive axe passed in Chromium/WebKit.')
