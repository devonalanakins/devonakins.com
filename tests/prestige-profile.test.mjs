import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderOneScreenHome} from '../src/professional/one-screen.mjs';

const html=renderOneScreenHome();
test('prestige profile preserves the six existing sections and truth-qualified telemetry',()=>{
  assert.match(html,/prestige-home/);
  assert.match(html,/DA \/ PROFESSIONAL PROFILE/);
  assert.match(html,/SOFTWARE DEVELOPER/);
  assert.match(html,/I build independent software/);
  for(const n of ['home','experience','work','activity','writing','contact'])
    assert.match(html,new RegExp('one-panel-'+n));
  assert.match(html,/data-public-github-feed/);
  assert.match(html,/data-public-spotify/);
  assert.match(html,/data-public-work/);
  assert.match(html,/data-work-state/);
  assert.match(html,/data-public-gpt/);
  assert.doesNotMatch(html,/(?:level\s*\d+|rank\s*#\d+|xp\s*\d+|3\.3B credits|clinical director)/i);
  assert.doesNotMatch(html,/headshot-concept\.webp|one-portrait/);
});
test('prestige override is first-party and respects reduced motion',async()=>{
  const css=await readFile(new URL('../src/professional/prestige-profile.css',import.meta.url),'utf8');
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/@import|url\(https?:/i);
  assert.match(html,/href="\/src\/professional\/prestige-profile.css"/);
});
test('source-qualified work badge is initially idle and cannot claim an active editor',()=>{
  assert.match(html,/data-public-work data-work-mode="idle"/);
  assert.match(html,/data-work-state>CHECKING SOURCE/);
  assert.match(html,/data-work-title>No verified active session/);
  assert.doesNotMatch(html,/Editor online|LIVE CODING|WORKING NOW/);
});
test('ambient animation is first-party, deterministic and disabled for reduced motion',async()=>{
  const css=await readFile(new URL('../src/professional/prestige-profile.css',import.meta.url),'utf8');
  for(const key of ['prestige-nebula','prestige-grid','prestige-pulse','prestige-reveal'])
    assert.match(css,new RegExp('@keyframes '+key));
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/data-work-mode="active"/);
  assert.doesNotMatch(css,/@import|url\(https?:|position:\s*fixed;\s*inset:0;\s*pointer-events:auto/i);
});

test('compact Spotify HUD reserves space for the real song, and the note lives on the listening page',async()=>{
  const css=await readFile(new URL('../src/professional/prestige-profile.css',import.meta.url),'utf8');
  assert.match(css,/\.prestige-stat-pair \.p-spotify-card\s*\{[^}]*display:grid/);
  assert.match(css,/\.prestige-stat-pair \.p-spotify-body\s*\{[^}]*grid-template-columns:52px minmax\(0,1fr\)/);
  assert.match(css,/\.prestige-stat-pair \.p-spotify-card \.p-signal-foot\{display:none\}/);
  assert.match(css,/\.prestige-stat-pair \.p-spotify-meta h3\s*\{[^}]*text-overflow:ellipsis/);
});
test('mission artwork uses independent resolution-free assets, never a scaled 2x3 bitmap atlas',async()=>{
  const css=await readFile(new URL('../src/professional/prestige-profile.css',import.meta.url),'utf8');
  for(const name of ['operations','systems','site']){
    assert.match(css,new RegExp('mission-'+name+'\\\\.svg'.replace('\\\\','\\')));
    const svg=await readFile(new URL('../public/professional/mission-'+name+'.svg',import.meta.url),'utf8');
    assert.match(svg,/<svg\b/);
    assert.match(svg,/viewBox="0 0 1200 640"/);
    assert.doesNotMatch(svg,/<image\b|data:image\/|<script\b|https?:\/\//);
  }
});
