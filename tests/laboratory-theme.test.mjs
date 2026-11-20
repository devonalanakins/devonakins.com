import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const script=await readFile(new URL('../public/laboratory-theme.js',import.meta.url),'utf8');
const style=await readFile(new URL('../src/professional/research-theme.css',import.meta.url),'utf8');

function harness({dark=false,saved=null,blocked=false}={}){
  const stored=new Map(saved===null?[]:[['devonakins.appearance.v1',saved]]);
  const events={};
  const meta={value:'#f3f1e9',setAttribute(_name,value){this.value=value}};
  const controls=Array.from({length:2},()=>({
    value:'system',
    addEventListener(_name,callback){this.onChange=callback},
    pick(value){this.value=value;this.onChange()}
  }));
  const document={
    documentElement:{dataset:{}},
    readyState:'loading',
    querySelector:()=>meta,
    querySelectorAll:()=>controls,
    addEventListener:(event,callback)=>{events[event]=callback}
  };
  const media={matches:dark,addEventListener:(event,callback)=>{events['media-'+event]=callback}};
  const window={
    matchMedia:()=>media,
    addEventListener:(event,callback)=>{events[event]=callback},
    localStorage:{
      getItem:key=>{if(blocked)throw Error('blocked');return stored.get(key)||null},
      setItem:(key,value)=>{if(blocked)throw Error('blocked');stored.set(key,value)},
      removeItem:key=>{if(blocked)throw Error('blocked');stored.delete(key)}
    }
  };
  runInNewContext(script,{document,window});
  events.DOMContentLoaded();
  return {root:document.documentElement,media,events,controls,meta,stored};
}
test('auto-selects matching OS scheme before the document is ready',()=>{
  const light=harness(),dark=harness({dark:true});
  assert.equal(light.root.dataset.theme,'light');
  assert.equal(dark.root.dataset.theme,'dark');
  assert.equal(dark.root.dataset.themePreference,'system');
  assert.equal(dark.meta.value,'#0c111a');
  assert.equal(light.meta.value,'#f3f1e9');
  assert.equal(light.controls.length,2);
});
test('tracks OS changes only while System is active',()=>{
  const ui=harness();
  ui.media.matches=true;ui.events['media-change']();
  assert.equal(ui.root.dataset.theme,'dark');
  ui.controls[0].pick('light');
  assert.equal(ui.controls[1].value,'light');
  ui.media.matches=false;ui.events['media-change']();
  ui.media.matches=true;ui.events['media-change']();
  assert.equal(ui.root.dataset.theme,'light');
  assert.equal(ui.stored.get('devonakins.appearance.v1'),'light');
  ui.controls[1].pick('system');
  assert.equal(ui.root.dataset.theme,'dark');
  assert.equal(ui.stored.has('devonakins.appearance.v1'),false);
});
test('saved choices, cross-tab updates and blocked storage fail safely',()=>{
  const dark=harness({saved:'dark'});
  assert.equal(dark.root.dataset.theme,'dark');
  dark.stored.set('devonakins.appearance.v1','light');
  dark.events.storage({key:'devonakins.appearance.v1'});
  assert.equal(dark.root.dataset.theme,'light');
  assert.equal(dark.controls[0].value,'light');
  const blocked=harness({dark:true,blocked:true});
  blocked.controls[0].pick('light');
  assert.equal(blocked.root.dataset.theme,'light');
  assert.equal(blocked.root.dataset.themePreference,'light');
  assert.equal(harness({saved:'invalid'}).root.dataset.theme,'light');
});
test('dark styles cover reading surfaces, navigation, form controls and focus',()=>{
  for(const selector of ['.lab-header','.lab-action-primary','.lab-destination--research',
    '.da-process','.da-project-question','.da-sketch','.lab-project-browser input',
    '.lab-research-instrument','focus-visible']){
    assert.ok(style.includes(selector),selector);
  }
  assert.match(style,/html\.lab-html\[data-theme="dark"\]/);
  assert.doesNotMatch(script,/fetch\(|XMLHttpRequest|sendBeacon|document\.cookie/);
});
