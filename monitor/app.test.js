'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

class Element {
  constructor() {
    this.children = [];
    this.listeners = new Map();
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.style = {};
    this.classList = { toggle() {} };
  }

  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  setAttribute() {}
  addEventListener(event, callback) { this.listeners.set(event, callback); }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const STAGE_IDS = [
  '01-requirements', '02-context', '03-generation', '04-review',
  '05-tests', '06-test-execution', '07-acceptance',
];

function status(runId, currentStage, state = 'running', revision = '1') {
  return {
    statusFileExists: true,
    valid: true,
    snapshot: {
      runId, status: state, currentStage, lastUpdated: new Date().toISOString(),
      manifest: 'manifest.json',
    },
    stages: STAGE_IDS.map((id) => ({
      id, agent: id, status: id === currentStage ? state : 'pending',
      revision, gate: state === 'completed' ? 'pass' : 'block',
      activity: `${id}: ${state} revision ${revision}`,
      references: `history/${id}-${revision}.json`,
    })),
  };
}

async function browserHarness(fetchPayload) {
  const nodes = new Map();
  let timer;
  const context = vm.createContext({
    document: {
      querySelector(selector) {
        if (!nodes.has(selector)) nodes.set(selector, new Element());
        return nodes.get(selector);
      },
      createElement: () => new Element(),
      createTextNode: (value) => ({ textContent: value }),
    },
    window: { setInterval(callback, interval) { timer = { callback, interval }; } },
    fetch: async (url) => ({ ok: true, json: async () => fetchPayload(url) }),
    Date, Intl, console,
  });
  const script = await fs.readFile(path.join(__dirname, 'app.js'), 'utf8');
  await vm.runInContext(`(async () => { ${script}\nreturn { poll, selectStage }; })()`, context);
  return {
    nodes, timer,
    async tick() {
      timer.callback();
      await new Promise((resolve) => setImmediate(resolve));
    },
    async changeRun(runId) {
      nodes.get('#run-select').value = runId;
      nodes.get('#run-select').listeners.get('change')();
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

test('three-second polling refreshes every stage, checkpoint, retry and telemetry', async () => {
  let current = status('run-a', STAGE_IDS[0]);
  const harness = await browserHarness((url) => url === '/api/runs'
    ? { runs: [{ id: 'run-a', statusFileExists: true }], rootExists: true }
    : current);
  assert.equal(harness.timer.interval, 3000);
  for (const stageId of STAGE_IDS) {
    for (const state of ['running', 'blocked', 'failed', 'completed']) {
      current = status('run-a', stageId, state, state === 'completed' ? '2' : '1');
      current.metrics = {
        summary: { total_tokens: 400 },
        stages: [{ stage_id: stageId, total_tokens: 123, execution_seconds: 2 }],
      };
      await harness.tick();
      assert.equal(harness.nodes.get('#overall-status').textContent, state);
      assert.equal(harness.nodes.get('#pipeline').children.length, 7);
      assert.equal(harness.nodes.get('#stage-rows').children.length, 7);
      const index = STAGE_IDS.indexOf(stageId);
      const row = harness.nodes.get('#stage-rows').children[index];
      assert.equal(row.children[1].children[0].textContent, state);
      assert.equal(row.children[2].textContent, state === 'completed' ? '2' : '1');
      assert.equal(row.children[5].textContent, '123');
      row.listeners.get('click')();
      assert.equal(harness.nodes.get('#detail-activity').textContent, current.stages[index].activity);
      assert.equal(harness.nodes.get('#detail-revision').textContent, `REV ${current.stages[index].revision}`);
      assert.equal(harness.nodes.get('#detail-references').children[0].textContent, current.stages[index].references);
      assert.equal(harness.nodes.get('#completed-count').innerHTML,
        `${state === 'completed' ? 1 : 0} <small>/ 7</small>`);
    }
  }
});

test('switching runs during an in-flight poll cannot render the previous run', async () => {
  const pending = deferred();
  let hold = false;
  let requestsForB = 0;
  const harness = await browserHarness((url) => {
    if (url === '/api/runs') return {
      runs: [{ id: 'run-a', statusFileExists: true }, { id: 'run-b', statusFileExists: true }],
      rootExists: true,
    };
    if (url.endsWith('run-b')) {
      requestsForB += 1;
      return status('run-b', '07-acceptance');
    }
    return hold ? pending.promise : status('run-a', '01-requirements');
  });
  hold = true;
  await harness.tick();
  await harness.changeRun('run-b');
  pending.resolve(status('run-a', '01-requirements', 'failed'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.nodes.get('#run-id').textContent, 'run-b');
  assert.equal(harness.nodes.get('#run-select').value, 'run-b');
  assert.equal(harness.nodes.get('#current-stage').textContent, 'Acceptance');
  assert.equal(harness.nodes.get('#overall-status').textContent, 'running');
  assert.equal(requestsForB, 1, 'The queued run change must refresh immediately.');
});

test('poll errors remain visible with no selected run', async () => {
  const harness = await browserHarness(() => { throw new Error('Read failed'); });
  assert.equal(harness.nodes.get('#notice').hidden, false);
  assert.equal(harness.nodes.get('#notice').textContent, 'Read failed');
});

test('missing status and malformed telemetry are explicit and recover on the next poll', async () => {
  let current = { statusFileExists: false, valid: false, errors: ['Missing live status'] };
  const harness = await browserHarness((url) => url === '/api/runs'
    ? { runs: [{ id: 'run-a', statusFileExists: false }], rootExists: true }
    : current);
  assert.equal(harness.nodes.get('#notice').textContent, 'Missing live status');
  current = { ...status('run-a', '03-generation'), valid: false, errors: ['Malformed execution-metrics.json'] };
  await harness.tick();
  assert.ok(harness.nodes.get('#notice').textContent.includes('Malformed execution-metrics.json'));
  current = status('run-a', '03-generation');
  await harness.tick();
  assert.equal(harness.nodes.get('#notice').hidden, true);
  assert.equal(harness.nodes.get('#dashboard').hidden, false);
});
