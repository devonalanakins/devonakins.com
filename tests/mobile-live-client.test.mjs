import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

// Execute the actual viewer module with TypeScript annotations removed, using
// deterministic timers and sequential live, stalled and recovered responses.
test('hung live-status request times out, hides stale state and permits the next poll', async () => {
  const source = await readFile(new URL('../src/professional/mobile-live-client.ts', import.meta.url), 'utf8');
  const script = stripTypeScriptTypes(source);
  const element = (text = '') => ({
    textContent: text, hidden: false, children: [],
    replaceChildren(...children) {this.children = children;},
    setAttribute() {},
  });
  const status = element('NOT BROADCASTING');
  const nodes = new Map([
    ['[data-live-status]', status],
    ['[data-live-headline]', element()],
    ['[data-live-description]', element()],
    ['[data-live-offline]', element()],
    ['[data-live-player]', element()],
    ['[data-live-stage-label]', element()],
  ]);
  const state = {value: null};
  const root = {
    querySelector: key => nodes.get(key) ?? null,
    setAttribute: (key, value) => {if (key === 'data-live-state') state.value = value;},
  };
  const document = {
    hidden: false,
    querySelector: key => key === '[data-mobile-live]' ? root : null,
    createElement: tag => ({tagName: tag}),
    addEventListener() {},
  };
  let poll;
  let deadline;
  let cleared = 0;
  const window = {
    setInterval: (callback, delay) => {
      assert.equal(delay, 45_000);
      poll = callback;
      return 1;
    },
    setTimeout: (callback, delay) => {
      assert.equal(delay, 6_000);
      deadline = callback;
      return 2;
    },
    clearTimeout: id => {
      assert.equal(id, 2);
      cleared++;
    },
  };
  const calls = [];
  const iframeUrl = 'https://customer-abcd1234.cloudflarestream.com/' + 'a'.repeat(32) + '/iframe';
  const fetch = (_url, options) => {
    calls.push(options);
    if (calls.length === 2) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Error('synthetic stall')), {once: true});
      });
    }
    return Promise.resolve({ok: true, json: async () => calls.length === 1
      ? {state: 'live', playerUrl: iframeUrl} : {state: 'offline'}});
  };
  runInNewContext(script, {document, window, fetch, AbortController, URL});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.equal(typeof deadline, 'function');
  assert.equal(typeof poll, 'function');

  // First poll displays one synthetic, valid public player.
  const player = nodes.get('[data-live-player]');
  const offline = nodes.get('[data-live-offline]');
  assert.equal(status.textContent, 'LIVE NOW');
  assert.equal(state.value, 'live');
  assert.equal(player.hidden, false);
  assert.equal(offline.hidden, true);
  assert.equal(player.children.length, 1);
  assert.equal(player.children[0].src, iframeUrl);
  assert.equal(cleared, 1);

  // Next poll stalls. A second tick must not start an overlapping request.
  poll();
  poll();
  assert.equal(calls.length, 2);
  deadline();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[1].signal.aborted, true);
  assert.equal(status.textContent, 'STATUS UNAVAILABLE');
  assert.equal(state.value, 'unavailable');
  assert.equal(player.hidden, true);
  assert.equal(player.children.length, 0);
  assert.equal(offline.hidden, false);
  assert.equal(cleared, 2);

  // Polling recovers without inventing a LIVE status or retaining the iframe.
  poll();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 3);
  assert.equal(status.textContent, 'OFF AIR');
  assert.equal(state.value, 'offline');
  assert.equal(player.children.length, 0);
  assert.equal(cleared, 3);
});
