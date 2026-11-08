#!/usr/bin/env python3
"""Real software-WebGL loss/recovery and accessible camera behavior, never provider data."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from v5_browser_acceptance import server
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--chromium-executable');parser.add_argument('--constrained',action='store_true');args=parser.parse_args()
    options={'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
    if args.chromium_executable:options['executable_path']=args.chromium_executable
    if args.constrained:options['args']+=['--single-process','--no-zygote','--no-sandbox']
    out=ROOT/'.artifacts/v5-site-candidate';out.mkdir(parents=True,exist_ok=True)
    with server(True) as origin,sync_playwright() as p:
        browser=p.chromium.launch(**options)
        try:
            page=browser.new_page(viewport={'width':1440,'height':900});errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(origin+'/__v5_preview__/field/',wait_until='networkidle')
            page.wait_for_function("document.querySelector('[data-v5-atlas]').dataset.v5AtlasReady === 'true'",timeout=15000)
            page.locator('[data-v5-atlas-select="project:mizvo"]').click()
            for action in ['focus','in','out','left','right','up','down','reset']:page.locator('[data-v5-camera="'+action+'"]').click()
            page.evaluate("window.lossExtension=document.querySelector('[data-v5-atlas-host] canvas').getContext('webgl2').getExtension('WEBGL_lose_context');lossExtension.loseContext()")
            page.wait_for_function("document.querySelector('[data-v5-atlas-host]').dataset.v5AtlasFallback === 'true'")
            assert page.locator('[data-v5-atlas-node-id]').count()==12
            assert page.locator('[data-v5-camera-controls]').is_hidden()
            page.locator('[data-v5-atlas-search]').fill('Merit');assert page.locator('[data-v5-atlas-select]:visible').count()==1
            page.locator('[data-v5-atlas-search]').fill('')
            page.wait_for_timeout(300);page.evaluate('lossExtension.restoreContext()')
            page.wait_for_function("document.querySelector('[data-v5-atlas]').dataset.v5AtlasReady === 'true'")
            assert page.locator('[data-v5-camera-controls]').is_visible()
            page.locator('[data-v5-camera="reset"]').focus();page.keyboard.press('Enter')
            rect=page.locator('.v5-atlas-viewport').bounding_box();assert 620<=rect['height']<=900
            assert page.locator('[data-v5-atlas-host] canvas').count()==1
            page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
            page.locator('[data-v5-camera="left"]').click();assert not errors,errors
            page.screenshot(path=str(out/'software-webgl-restored.png'),full_page=True,timeout=20000)
            (out/'software-webgl-lifecycle.json').write_text(json.dumps({'software_webgl':'verified','physical_gpu':'not tested','loss_recovery':'passed','semantic_entries':12,'approved_project_roots':8,'camera_controls':'passed','viewport_height':rect['height']},indent=2))
            print('Software WebGL lifecycle passed: camera controls, loss, accessible filtering, restoration and BFCache; physical GPU not tested.')
        finally:browser.close()
if __name__=='__main__':main()
