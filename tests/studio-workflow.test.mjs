import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_STAGES,renderStudioWorkflow} from '../src/professional/studio-workflow.mjs';
import {renderCreatorPage} from '../src/professional/creator-pages.mjs';

test('studio flow distinguishes current hardware, proposed laptop, offline broadcast and reviewed media', () => {
  assert.deepEqual(STUDIO_STAGES.map(stage => stage.title), ['Capture','Produce','Broadcast','Publish']);
  assert.deepEqual(STUDIO_STAGES.map(stage => stage.state),
    ['Current kit','Workflow in design','Not broadcasting','Review required']);
  const markup=renderStudioWorkflow();
  assert.match(markup, /id="studio" aria-labelledby="pc-studio-title"/);
  assert.match(markup, /<ol class="pc-studio-flow" aria-label="Studio production workflow">/);
  assert.equal((markup.match(/class="pc-studio-step"/g)||[]).length, 4);
  assert.match(markup, /There is no public home server or automatic replay system/);
  assert.doesNotMatch(markup, /<iframe|<video|autoplay|camera permission|stream key|192\.168\.|patient|family sharing/i);
});

test('My Setup and Live connect to the studio without enabling a false stream', () => {
  const setup=renderCreatorPage('/setup/');
  const live=renderCreatorPage('/live/');
  assert.match(setup, /href="#studio">Studio flow<\/a>/);
  assert.match(setup, /From the garage to your screen/);
  assert.match(setup, /href="\/live\/">Visit Live/);
  assert.match(setup, /href="\/watch\/">Explore Watch/);
  assert.match(live, /href="\/setup\/#studio">How the studio works/);
  assert.match(live, /NOT BROADCASTING/);
  assert.match(live, /data-live-player hidden/);
  assert.doesNotMatch(live, /<iframe[^>]*cloudflarestream/);
});
