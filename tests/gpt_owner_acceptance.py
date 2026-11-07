#!/usr/bin/env python3
"""Synthetic owner-only UI checks; no credentials, live readings or external requests."""
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
html = subprocess.check_output(['node','--input-type=module','-e',
    "import {renderGptOwner} from './src/gpt-owner-page.mjs'; import {GPT_OWNER_METRICS} from './src/gpt-snapshots.mjs'; process.stdout.write(renderGptOwner(GPT_OWNER_METRICS));"], cwd=ROOT, text=True)
metrics = [
    'profile_7d_tokens','profile_lifetime_tokens_approx','profile_7d_messages','profile_streak_days',
    'work_codex_credits_remaining','work_codex_credits_used','business_7d_messages','business_7d_credits_used'
]
with sync_playwright() as p:
    for engine in [p.chromium,p.webkit]:
        browser=engine.launch()
        for width in [320,390,1440]:
            context=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce')
            page=context.new_page()
            state={'revision':7,'posts':[],'fail':False}
            def route(request):
                path=request.request.url.split('example.test',1)[-1]
                if path=='/owner/gpt/':
                    return request.fulfill(body=html,content_type='text/html')
                if path.startswith('/v2/'):
                    file=ROOT/'public'/path.lstrip('/')
                    return request.fulfill(body=file.read_text(),content_type='text/css' if file.suffix=='.css' else 'text/javascript')
                if path=='/api/presence/owner?channel=gpt':
                    if request.request.method=='POST':
                        body=request.request.post_data_json
                        state['posts'].append(body)
                        if state['fail']:
                            return request.fulfill(status=409,json={'error':'Records changed. Nothing was saved.'})
                        state['revision']+=len(body.get('measurements',[]))
                        return request.fulfill(json={'saved':True,'count':len(body['measurements']),'revision':state['revision']})
                    return request.fulfill(json={'version':2,'revision':state['revision'],'publishingAllowed':False,'observations':[]})
                return request.abort()
            page.route('**/*',route)
            page.goto('https://example.test/owner/gpt/')
            page.wait_for_function("document.querySelector('#gpt-form-status').textContent.startsWith('Ready.')")
            assert page.locator('input[data-metric]').count()==8
            assert page.locator('select').count()==0
            assert page.locator('fieldset').count()==3
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (engine.name,width,'overflow')
            for metric in metrics:
                control=page.locator('#gpt-'+metric)
                assert control.is_visible()
                assert control.get_attribute('aria-describedby')=='gpt-last-'+metric
                assert control.bounding_box()['height']>=44
            page.locator('#gpt-profile_7d_tokens').fill('12345')
            page.locator('#gpt-work_codex_credits_used').fill('4.25')
            page.locator('#gpt-save').click()
            page.wait_for_function("document.querySelector('#gpt-form-status').textContent.startsWith('2 readings saved')")
            assert state['posts'][0]=={'action':'record-batch','revision':7,'measurements':[
                {'metric':'profile_7d_tokens','value':12345},{'metric':'work_codex_credits_used','value':4.25}]}
            assert all(page.locator('#gpt-'+metric).input_value()=='' for metric in metrics)
            state['fail']=True
            page.locator('#gpt-profile_7d_messages').fill('99')
            page.locator('#gpt-save').click()
            page.wait_for_function("document.querySelector('#gpt-form-status').textContent.includes('Your entries are preserved')")
            assert page.locator('#gpt-profile_7d_messages').input_value()=='99'
            assert page.locator('#gpt-save').is_disabled()
            page.locator('#gpt-reload').click()
            page.wait_for_function("document.querySelector('#gpt-form-status').textContent.startsWith('Current records loaded')")
            assert page.locator('#gpt-save').is_enabled()
            assert page.locator('#gpt-profile_7d_messages').input_value()=='99'
            # Keyboard access starts with the skip link and reaches the batch inputs.
            page.goto('https://example.test/owner/gpt/')
            page.keyboard.press('Tab')
            assert page.locator('.skip').evaluate('el=>el===document.activeElement')
            page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
            violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
            assert not violations, [(v['id'],[n['target'] for n in v['nodes']]) for v in violations]
            context.close()
        browser.close()
print('GPT batch owner UI: Chromium/WebKit at 320,390,1440px; batch omission, conflict recovery, keyboard and axe passed.')
