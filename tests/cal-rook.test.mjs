import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decorateCalRook} from '../src/professional/cal-rook.mjs';
import {renderResearchFacilityHome} from '../src/professional/research-facility.mjs';
import {renderCreatorPage,creatorPaths} from '../src/professional/creator-pages.mjs';
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
test('workshop preserves canonical owner, navigation and project paths',()=>{
  const baseline=renderResearchFacilityHome();
  const html=decorateCalRook(baseline,'/');
  assert.match(html,/<h1 class="da-name">Devon Alan Akins<\/h1>/);
  assert.match(html,/Cal Rook · fictional AI workshop guide/);
  assert.match(html,/See what I’ve built/);
  assert.match(html,/Read the field notes/);
  assert.match(html,/Open source; not a production certification or completed release/);
  for(const href of hrefs(baseline).filter(x=>!x.startsWith('/favicon'))) assert.ok(hrefs(html).includes(href),href);
  assert.match(html,/<link rel="canonical" href="https:\/\/devonakins.com\/">/);
  assert.doesNotMatch(html,/data-chat|fictional inbox/);
});
test('creator routes retain their existing links and content',()=>{
  for(const path of creatorPaths){
    const baseline=renderCreatorPage(path), html=decorateCalRook(baseline,path);
    for(const href of hrefs(baseline).filter(x=>!x.startsWith('/favicon'))) assert.ok(hrefs(html).includes(href),path+' '+href);
    assert.match(html,/data-cal-rook/);
    assert.match(html,/cal-rook\.css/);
    if(path==='/about/') assert.match(html,/not a chatbot or a separate person/);
  }
});
