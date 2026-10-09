'use strict';

const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const MONITOR_DIR = __dirname;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);
const STAGES = [
  '01-requirements',
  '02-context',
  '03-generation',
  '04-review',
  '05-tests',
  '06-postman',
];
const STATUSES = new Set(['pending', 'running', 'blocked', 'failed', 'completed']);

function parseOptions(args) {
  let artifactsArgument;
  let port = Number(process.env.PORT || 4173);

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--artifacts') {
      artifactsArgument = args[index + 1];
      index += 1;
    } else if (args[index] === '--port') {
      port = Number(args[index + 1]);
      index += 1;
    } else if (args[index] === '--help') {
      console.log('Usage: node server.js [--artifacts <path>] [--port <port>]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
  }

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('Port must be an integer from 0 to 65535.');
  }

  const configuredRoot = artifactsArgument || process.env.MONITOR_ARTIFACT_ROOT;
  const artifactRoot = configuredRoot
    ? path.resolve(process.cwd(), configuredRoot)
    : path.resolve(MONITOR_DIR, '..', 'artifacts');

  return { artifactRoot, port };
}

function cleanValue(value) {
  const trimmed = value.trim();
  const codeValue = trimmed.match(/^`(.*)`$/);
  return codeValue ? codeValue[1].trim() : trimmed;
}

function parseStatus(markdown) {
  const errors = [];
  const snapshot = {};
  const stages = [];
  const values = new Map();

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.*?)\s*$/);
    if (match) values.set(match[1].trim(), cleanValue(match[2]));
  }

  snapshot.runId = values.get('Run ID') || '';
  snapshot.status = values.get('Overall status') || '';
  snapshot.currentStage = values.get('Current stage') || '';
  snapshot.lastUpdated = values.get('Last updated (UTC)') || '';
  snapshot.manifest = values.get('Manifest') || '';
  snapshot.latestHistoryEvent = values.get('Latest history event') || '';

  if (!snapshot.runId) errors.push('Run Snapshot is missing Run ID.');
  if (!STATUSES.has(snapshot.status)) errors.push('Run Snapshot has an unknown or missing overall status.');
  if (snapshot.currentStage !== 'null' && !STAGES.includes(snapshot.currentStage)) {
    errors.push('Run Snapshot has an unknown or missing current stage.');
  }
  if (!snapshot.lastUpdated || Number.isNaN(Date.parse(snapshot.lastUpdated))) {
    errors.push('Run Snapshot is missing a valid Last updated (UTC) timestamp.');
  }

  let foundStageTable = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cleanValue);
    if (cells[0] === 'Stage' && cells[1] === 'Agent') {
      foundStageTable = true;
      continue;
    }
    if (!STAGES.includes(cells[0])) continue;

    const stage = {
      id: cells[0],
      agent: cells[1] || '',
      status: cells[2] || '',
      revision: cells[3] || '',
      startedAt: cells[4] || '',
      updatedAt: cells[5] || '',
      gate: cells[6] || '',
      references: cells[7] || '',
      activity: cells[8] || '',
    };
    if (cells.length !== 9) errors.push(`${stage.id} row must have 9 columns.`);
    if (!STATUSES.has(stage.status)) errors.push(`${stage.id} has an unknown or missing status.`);
    if (stages.some((item) => item.id === stage.id)) errors.push(`${stage.id} appears more than once.`);
    stages.push(stage);
  }

  if (!foundStageTable) errors.push('Stage Status table is missing.');
  for (const stageId of STAGES) {
    if (!stages.some((stage) => stage.id === stageId)) errors.push(`${stageId} row is missing.`);
  }

  return { snapshot, stages, errors, valid: errors.length === 0 };
}

function isWithinRoot(root, target) {
  const relativePath = path.relative(root, target);
  return relativePath !== '' && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

function safeRunId(value) {
  return Boolean(value) && value !== '.' && value !== '..' && !/[\\/\0]/.test(value);
}

async function readRuns(artifactRoot) {
  let rootStat;
  try {
    rootStat = await fs.stat(artifactRoot);
  } catch (error) {
    if (error.code === 'ENOENT') return { artifactRoot, rootExists: false, runs: [] };
    throw error;
  }

  if (!rootStat.isDirectory()) return { artifactRoot, rootExists: true, runs: [], error: 'Artifact root is not a directory.' };

  const entries = await fs.readdir(artifactRoot, { withFileTypes: true });
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDirectory = path.join(artifactRoot, entry.name);
    let modifiedAt = null;
    let statusFileExists = false;
    try {
      const fileStat = await fs.stat(path.join(runDirectory, 'live-status.md'));
      statusFileExists = fileStat.isFile();
      if (statusFileExists) modifiedAt = fileStat.mtime.toISOString();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    runs.push({ id: entry.name, statusFileExists, modifiedAt });
  }

  runs.sort((left, right) => (right.modifiedAt || '').localeCompare(left.modifiedAt || '') || left.id.localeCompare(right.id));
  return { artifactRoot, rootExists: true, runs };
}

async function readRun(artifactRoot, runId) {
  if (!safeRunId(runId)) return { statusCode: 400, body: { error: 'Invalid run ID.' } };

  let realRoot;
  try {
    realRoot = await fs.realpath(artifactRoot);
  } catch (error) {
    if (error.code === 'ENOENT') return { statusCode: 404, body: { error: 'Artifact root does not exist.' } };
    throw error;
  }

  const runDirectory = path.join(realRoot, runId);
  const statusPath = path.join(runDirectory, 'live-status.md');
  let realStatusPath;
  try {
    realStatusPath = await fs.realpath(statusPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { statusCode: 200, body: { runId, statusFileExists: false, error: 'This run has no live-status.md file.' } };
    }
    throw error;
  }

  if (!isWithinRoot(realRoot, realStatusPath)) {
    return { statusCode: 403, body: { error: 'Status file resolves outside the configured artifact root.' } };
  }

  const [markdown, fileStat] = await Promise.all([fs.readFile(realStatusPath, 'utf8'), fs.stat(realStatusPath)]);
  return {
    statusCode: 200,
    body: {
      runId,
      statusFileExists: true,
      fileModifiedAt: fileStat.mtime.toISOString(),
      ...parseStatus(markdown),
    },
  };
}

function createServer(artifactRoot) {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");

    let requestUrl;
    try {
      requestUrl = new URL(request.url, 'http://127.0.0.1');
    } catch {
      sendError(response, 400, 'Malformed request URL.');
      return;
    }

    if (request.method !== 'GET') {
      sendError(response, 405, 'Only GET requests are supported.');
      return;
    }

    if (requestUrl.pathname === '/api/runs') {
      try {
        sendJson(response, 200, await readRuns(artifactRoot));
      } catch (error) {
        sendError(response, 500, `Could not read artifact root: ${error.message}`);
      }
      return;
    }

    const runMatch = requestUrl.pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch) {
      let runId;
      try {
        runId = decodeURIComponent(runMatch[1]);
      } catch {
        sendError(response, 400, 'Invalid run ID encoding.');
        return;
      }
      try {
        const result = await readRun(artifactRoot, runId);
        sendJson(response, result.statusCode, result.body);
      } catch (error) {
        sendError(response, 500, `Could not read run status: ${error.message}`);
      }
      return;
    }

    const asset = STATIC_FILES.get(requestUrl.pathname);
    if (!asset) {
      sendError(response, 404, 'Not found.');
      return;
    }

    try {
      const contents = await fs.readFile(path.join(MONITOR_DIR, asset[0]));
      response.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store' });
      response.end(contents);
    } catch (error) {
      sendError(response, 500, `Could not read monitor asset: ${error.message}`);
    }
  });
}

if (require.main === module) {
  try {
    const { artifactRoot, port } = parseOptions(process.argv.slice(2));
    const server = createServer(artifactRoot);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      console.log(`Pipeline monitor: http://127.0.0.1:${address.port}`);
      console.log(`Artifact root: ${artifactRoot}`);
      console.log('Status is read from live-status.md; it reflects file writes, not agent processes.');
      console.log('Stop with Ctrl+C.');
    });
    server.on('error', (error) => {
      console.error(`Server could not start: ${error.message}`);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createServer, parseOptions, parseStatus, readRun, readRuns };