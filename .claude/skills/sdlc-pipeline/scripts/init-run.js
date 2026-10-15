'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STAGES = [
  ['01-requirements', 'Requirement Agent'],
  ['02-context', 'Context Builder Agent'],
  ['03-generation', 'Code Generation Agent'],
  ['04-review', 'Code Review Agent'],
  ['05-tests', 'Test Case Agent'],
  ['06-test-execution', 'Test Execution Agent'],
  ['07-acceptance', 'Acceptance Check Agent'],
];

function parseArgs(argv) {
  const out = { repos: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--root') out.root = argv[++i];
    else if (arg === '--repo') out.repos.push(argv[++i]);
    else if (arg === '--help') {
      console.log('Usage: node init-run.js --run-id <id> [--root <runs-dir>] [--repo <id>=<path> ...]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!out.runId) throw new Error('--run-id is required');
  out.root = out.root || 'runs';
  return out;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

function main() {
  const { runId, root, repos } = parseArgs(process.argv.slice(2));
  const runRoot = path.resolve(process.cwd(), root, runId);

  if (fs.existsSync(runRoot)) {
    throw new Error(`Run root already exists: ${runRoot}. Use the Resume Procedure instead of re-initializing.`);
  }

  for (const dir of ['intake', 'decisions', 'blockers', 'history']) {
    fs.mkdirSync(path.join(runRoot, dir), { recursive: true });
  }
  for (const [stageId] of STAGES) {
    fs.mkdirSync(path.join(runRoot, stageId), { recursive: true });
  }

  const repositories = repos.map((entry) => {
    const [id, repoPath] = entry.split('=');
    if (!id || !repoPath) throw new Error(`--repo must be <id>=<path>, got: ${entry}`);
    return { id, root: repoPath, authorized_scopes: [] };
  });

  const manifest = {
    schema_version: '1.0',
    run_id: runId,
    artifact_root: path.relative(process.cwd(), runRoot).replace(/\\/g, '/'),
    repositories,
    intake_refs: [],
    policy_ref: null,
    decision_authority_refs: [],
    status: 'pending',
    current_stage: null,
    stages: STAGES.map(([stageId]) => ({
      stage_id: stageId,
      status: 'pending',
      allocated_revision: null,
      accepted_result_ref: null,
      invalidated_by: null,
      agent_binding: null,
      assignment_ref: null,
      depends_on: stageId === '01-requirements' ? [] : [STAGES[STAGES.findIndex((s) => s[0] === stageId) - 1][0]],
      attempts: [],
      checkpoint: null,
      blocker_refs: [],
      next_action: {
        action: stageId === '01-requirements'
          ? 'Validate intake and dispatch Requirement Agent'
          : 'Blocked on predecessor acceptance',
        owner: 'orchestrator',
        prerequisite_refs: [],
        invocation_ref: null,
      },
      started_at: null,
      updated_at: null,
      completed_at: null,
      activity: null,
    })),
    decision_refs: [],
    blocker_refs: [],
    history_refs: [],
    integrations: { jira: { status: 'not_checked', checked_at: null, scope_ref: null, probe_tool: null, evidence_ref: null, reason: 'Not yet checked at init.', required: false } },
    last_event_id: null,
    updated_at: nowIso(),
    next_action: { action: 'Validate intake, policy and approvals, then dispatch 01-requirements', owner: 'orchestrator' },
  };
  fs.writeFileSync(path.join(runRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const liveStatusRows = STAGES.map(([id, agent]) => `| ${id} | ${agent} | pending | - | - | - | - | - | - |`).join('\n');
  const liveStatus = `# Pipeline Run Status

## Run Snapshot
- Run ID: ${runId}
- Overall status: pending
- Current stage: null
- Last updated (UTC): ${nowIso()}
- Manifest: manifest.json
- Latest history event: -

## Stage Status
| Stage | Agent | Status | Revision | Started (UTC) | Updated (UTC) | Gate | Result / blocker references | Activity |
|---|---|---|---|---|---|---|---|---|
${liveStatusRows}
`;
  fs.writeFileSync(path.join(runRoot, 'live-status.md'), liveStatus);

  const detailedStatus = `# Detailed Pipeline Status
- Run ID: ${runId}
- Overall status: pending
- Last event ID: -
- Last updated (UTC): ${nowIso()}
- Manifest: manifest.json
- Next management action: Validate intake, policy and approvals, then dispatch 01-requirements, owner: orchestrator
`;
  fs.writeFileSync(path.join(runRoot, 'detailed-status.md'), detailedStatus);

  const executionMetrics = {
    schema_version: '1.0',
    run_id: runId,
    pipeline_status: 'pending',
    summary: {
      total_wall_clock_seconds: null,
      total_agent_execution_seconds: null,
      total_tokens: null,
      total_input_tokens: null,
      total_output_tokens: null,
      total_cached_tokens: null,
      prompt_cache_hit_rate_pct: null,
      total_cost_usd: null,
      cost_savings_usd: null,
      cost_savings_pct: null,
    },
    stages: STAGES.map(([stageId]) => ({
      stage_id: stageId,
      model_id: null,
      model_tier: null,
      execution_seconds: null,
      input_tokens: null,
      output_tokens: null,
      cached_tokens: null,
      total_tokens: null,
      cost_usd: null,
      cache_hit_rate_pct: null,
      duration_pct: null,
      skills_used: [],
    })),
  };
  fs.writeFileSync(path.join(runRoot, 'execution-metrics.json'), JSON.stringify(executionMetrics, null, 2));

  console.log(`Initialized run at ${runRoot}`);
}

main();
