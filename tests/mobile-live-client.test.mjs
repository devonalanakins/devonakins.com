import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// Execute the actual compiled browser module with deterministic timers and a
// status request that never answers until its AbortSignal fires.
test('hung live-status request times out, hides stale state and permits the next poll', async () => {
  const source = await readFile(new URL('../src/professional/mobile-live-client.ts', import.meta.url), 'utf8');
  const script = ts.transpileModule(source, {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None},
  }).outputText;
  const element = (text = '') => ({
    textContent: text, hidden: false,
    replaceChildren() {}, setAttribute() {},
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
  const fetch = (_url, options) => {
    calls.push(options);
    if (calls.length === 1) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Error('synthetic stall')), {once: true});
      });
    }
    return Promise.resolve({ok: true, json: async () => ({state: 'offline'})});
  };
  runInNewContext(script, {document, window, fetch, AbortController, URL});
  assert.equal(calls.length, 1);
  assert.equal(typeof deadline, 'function');
  assert.equal(typeof poll, 'function');

  // The single-flight guard prevents overlaps but cannot remain stuck forever.
  poll();
  assert.equal(calls.length, 1);
  deadline();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(status.textContent, 'STATUS UNAVAILABLE');
  assert.equal(state.value, 'unavailable');
  assert.equal(cleared, 1);

  poll();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 2);
  assert.equal(status.textContent, 'OFF AIR');
  assert.equal(state.value, 'offline');
  assert.equal(cleared, 2);
});
