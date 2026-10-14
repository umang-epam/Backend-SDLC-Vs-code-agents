'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { once } = require('node:events');
const test = require('node:test');
const { createServer, parseStatus, readRuns, readRun } = require('./server');

const STAGE_IDS = [
  '01-requirements',
  '02-context',
  '03-generation',
  '04-review',
  '05-tests',
  '06-test-execution',
  '07-acceptance',
];
const ROOT = path.resolve(__dirname, '..');

async function statusTemplate() {
  const protocol = await fs.readFile(path.join(ROOT, 'agents', 'orchestrator.md'), 'utf8');
  const template = protocol.match(/```markdown\r?\n(# Pipeline Run Status[\s\S]*?)```/);
  assert.ok(template, 'The protocol must define the monitor status template.');
  return template[1]
    .replace('<run-id>', 'test-run')
    .replace('<YYYY-MM-DDTHH:MM:SSZ>', '2026-10-14T10:00:00Z');
}

test('protocol template provides all seven stages including final acceptance', async () => {
  const parsed = parseStatus(await statusTemplate());
  assert.equal(parsed.valid, true, parsed.errors.join('\n'));
  assert.deepEqual(parsed.stages.map((stage) => stage.id), STAGE_IDS);
  assert.equal(parsed.stages.at(-1).agent, 'Acceptance Check Agent');
});

test('authoring-only status without an execution row is invalid', async () => {
  const markdown = (await statusTemplate()).replace(/^\| 06-test-execution .*\r?\n/m, '');
  const parsed = parseStatus(markdown);
  assert.equal(parsed.valid, false);
  assert.ok(parsed.errors.includes('06-test-execution row is missing.'));
});

for (const status of ['running', 'failed', 'blocked', 'completed']) {
  test(`execution ${status} state remains visible in the pipeline`, async () => {
    const markdown = (await statusTemplate())
      .replace('Overall status: pending', `Overall status: ${status}`)
      .replace('Current stage: null', 'Current stage: 06-test-execution')
      .replace('| 06-test-execution | Test Execution Agent | pending |',
        `| 06-test-execution | Test Execution Agent | ${status} |`);
    const parsed = parseStatus(markdown);
    assert.equal(parsed.valid, true, parsed.errors.join('\n'));
    assert.equal(parsed.snapshot.currentStage, '06-test-execution');
    assert.equal(parsed.stages.find((stage) => stage.id === '06-test-execution').status, status);
  });
}

test('monitor serves the seven-stage interface and final acceptance label', async (t) => {
  const server = createServer(path.join(ROOT, 'artifacts'));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const [htmlResponse, scriptResponse, styleResponse] = await Promise.all([
    fetch(base), fetch(`${base}/app.js`), fetch(`${base}/styles.css`),
  ]);
  for (const response of [htmlResponse, scriptResponse, styleResponse]) {
    assert.equal(response.status, 200);
  }
  const [html, script, style] = await Promise.all([
    htmlResponse.text(), scriptResponse.text(), styleResponse.text(),
  ]);
  assert.ok(html.includes('SEQUENCE 01-07'));
  assert.ok(html.includes('0 <small>/ 7</small>'));
  assert.ok(script.includes("'06-test-execution': 'Test Execution'"));
  assert.ok(script.includes('Object.keys(STAGE_LABELS).length'));
  assert.ok(script.includes("'07-acceptance': 'Acceptance'"));
  assert.ok(style.includes('grid-template-columns: repeat(7, minmax(0, 1fr))'));
});

async function artifactFixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pipeline-monitor-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runDirectory = path.join(root, 'test-run');
  await fs.mkdir(runDirectory);
  return { root, runDirectory };
}

test('API rereads every stage transition, failure, retry and final completion', async (t) => {
  const { root, runDirectory } = await artifactFixture(t);
  const server = createServer(root);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/runs/test-run`;
  const template = await statusTemplate();
  const rows = parseStatus(template).stages;
  for (const [index, row] of rows.entries()) {
    for (const status of ['running', 'blocked', 'failed', 'completed']) {
      row.status = status;
      row.revision = status === 'completed' ? '2' : '1';
      row.gate = status === 'completed' ? 'pass' : 'block';
      row.references = `history/event-${index}-${status}.json`;
      row.activity = `Checkpoint ${index}: ${status}`;
      row.updatedAt = `2026-10-14T10:0${index}:00Z`;
      const overall = index === rows.length - 1 && status === 'completed' ? 'completed'
        : status === 'completed' ? 'running' : status;
      const markdown = template
        .replace('Overall status: pending', `Overall status: ${overall}`)
        .replace('Current stage: null', `Current stage: ${row.id}`)
        .replace('2026-10-14T10:00:00Z', row.updatedAt)
        .replace(/^\| 0[1-7]-.*$/gm, (line) => {
          const stage = rows.find((item) => line.startsWith(`| ${item.id} |`));
          return `| ${stage.id} | ${stage.agent} | ${stage.status} | ${stage.revision} | - | ${stage.updatedAt} | ${stage.gate} | ${stage.references} | ${stage.activity} |`;
        });
      await fs.writeFile(path.join(runDirectory, 'live-status.md'), markdown);
      await fs.writeFile(path.join(runDirectory, 'execution-metrics.json'), JSON.stringify({
        run_id: 'test-run',
        summary: { total_tokens: index * 100 + row.revision.length },
        stages: [{ stage_id: row.id, total_tokens: index * 100 }],
      }));
      const response = await fetch(url);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const result = await response.json();
      assert.equal(result.valid, true, result.errors.join('\n'));
      assert.equal(result.snapshot.status, overall);
      assert.equal(result.snapshot.currentStage, row.id);
      assert.equal(result.snapshot.lastUpdated, row.updatedAt);
      assert.deepEqual(result.stages[index], { ...row, startedAt: '-' });
      assert.equal(result.metrics.stages[0].total_tokens, index * 100);
      assert.equal(result.stages.filter((stage) => stage.status === 'completed').length,
        index + (status === 'completed' ? 1 : 0));
    }
  }
});

test('run discovery distinguishes live status from telemetry-only runs', async (t) => {
  const { root, runDirectory } = await artifactFixture(t);
  await fs.writeFile(path.join(runDirectory, 'detailed-status.md'), '# Checkpoint');
  await fs.writeFile(path.join(runDirectory, 'execution-metrics.json'), '{}');
  assert.equal((await readRuns(root)).runs[0].statusFileExists, false);
  await fs.writeFile(path.join(runDirectory, 'live-status.md'), await statusTemplate());
  assert.equal((await readRuns(root)).runs[0].statusFileExists, true);
});

test('missing status does not fabricate a fresh update timestamp', async (t) => {
  const { root } = await artifactFixture(t);
  const { body } = await readRun(root, 'test-run');
  assert.equal(body.statusFileExists, false);
  assert.equal(body.valid, false);
  assert.equal(body.fileModifiedAt, null);
  assert.equal(body.snapshot.lastUpdated, '');
});

test('malformed telemetry is surfaced and recovered on the next read', async (t) => {
  const { root, runDirectory } = await artifactFixture(t);
  await fs.writeFile(path.join(runDirectory, 'live-status.md'), await statusTemplate());
  const metricsPath = path.join(runDirectory, 'execution-metrics.json');
  for (const contents of ['{', 'null', '{"run_id":"another-run","summary":{},"stages":[]}']) {
    await fs.writeFile(metricsPath, contents);
    const { body } = await readRun(root, 'test-run');
    assert.equal(body.valid, false);
    assert.equal(body.metrics, null);
    assert.ok(body.errors.some((error) => error.includes('execution-metrics.json')));
  }
  await fs.writeFile(metricsPath, '{"run_id":"test-run","summary":{},"stages":[]}');
  assert.equal((await readRun(root, 'test-run')).body.valid, true);
});

test('a different run identity cannot silently replace the selected run', async (t) => {
  const { root, runDirectory } = await artifactFixture(t);
  await fs.writeFile(path.join(runDirectory, 'live-status.md'),
    (await statusTemplate()).replace('Run ID: test-run', 'Run ID: another-run'));
  const { body } = await readRun(root, 'test-run');
  assert.equal(body.valid, false);
  assert.ok(body.errors.includes('live-status.md Run ID does not match the selected run.'));
});

test('final acceptance is mandatory even when execution has a completed row', async () => {
  const markdown = (await statusTemplate())
    .replace('| 06-test-execution | Test Execution Agent | pending |',
      '| 06-test-execution | Test Execution Agent | completed |')
    .replace(/^\| 07-acceptance .*\r?\n/m, '');
  const parsed = parseStatus(markdown);
  assert.equal(parsed.valid, false);
  assert.ok(parsed.errors.includes('07-acceptance row is missing.'));
});
