# Detailed Pipeline Status and Metrics

Initialize one copy at `artifacts/<run-id>/detailed-status.md` and a machine-readable companion at `artifacts/<run-id>/execution-metrics.json` for each pipeline run. The orchestrator maintains this document throughout the run lifecycle, updating stage execution states, time spent in each agent, token consumption, and calculated dollar costs after every invocation, checkpoint, retry, or acceptance event.

---

## 1. Pipeline Execution Snapshot

| Metric / Attribute | Value |
|---|---|
| **Run ID** | `example-run-20261012-001` |
| **Jira Ticket Reference** | `intake/jira-ticket-PROJ-123.json` |
| **Confirmed Tech Stack** | `decisions/DEC-001-tech-stack.json` |
| **Pipeline Status** | `pending` \| `running` \| `blocked` \| `failed` \| `completed` |
| **Current Stage** | `01-requirements` \| `02-context` \| `03-generation` \| `04-review` \| `05-tests` \| `06-postman` \| `null` |
| **Active Revision** | `r0001` |
| **Start Time (UTC)** | `YYYY-MM-DDTHH:MM:SSZ` |
| **Last Updated / End Time (UTC)** | `YYYY-MM-DDTHH:MM:SSZ` |
| **Total Wall-Clock Elapsed Time** | `00:00:00` (HH:MM:SS) |
| **Total Cumulative Agent Execution Time** | `00:00:00` (HH:MM:SS) |
| **Total Prompt / Input Tokens** | `0` |
| **Total Completion / Output Tokens** | `0` |
| **Total Cached Tokens (Read / Write)** | `0 / 0` |
| **Total Pipeline Tokens** | `0` |
| **Total Pipeline Cost (USD)** | `$0.0000` |
| **Manifest Reference** | `manifest.json` |
| **Live Checklist Reference** | `live-status.md` |
| **Cost Optimization Guidelines** | [cost-optimization.md](cost-optimization.md) |
| **Metrics Data Reference** | `execution-metrics.json` |
| **Gate Policy Reference** | `intake/gate-policy.json` |
| **Active Blockers** | `0` |
| **Approved Exceptions** | `0` |

---

## 2. Agent Execution, Timing, Token & Cost Summary

Use this master table to compare execution durations, token footprints, and cost distributions across all six sequential agents. For retried stages across multiple revisions, summarize the cumulative totals across all revisions for that stage, with individual revision rows detailed in Section 4.

| Stage ID | Agent Name | Status | Current Rev | Started (UTC) | Ended (UTC) | Duration | Input Tokens | Output Tokens | Total Tokens | Model ID | Cost (USD) |
|---|---|---|---:|---|---|---:|---:|---:|---:|---|---:|
| `01-requirements` | Requirement Agent | `pending` | `r0001` | - | - | 0s | 0 | 0 | 0 | `model-id` | $0.0000 |
| `02-context` | Context Builder Agent | `pending` | `r0001` | - | - | 0s | 0 | 0 | 0 | `model-id` | $0.0000 |
| `03-generation` | Code Generation Agent | `pending` | `r0001` | - | - | 0s | 0 | 0 | 0 | `model-id` | $0.0000 |
| `04-review` | Code Review Agent | `pending` | `r0001` | - | - | 0s | 0 | 0 | 0 | `model-id` | $0.0000 |
| `05-tests` | Test Case Agent | `pending` | `r0001` | - | - | 0s | 0 | 0 | 0 | `model-id` | $0.0000 |
| `06-postman` | Postman Agent | `pending` | `r0001` | - | - | 0s | 0 | 0 | 0 | `model-id` | $0.0000 |
| **Pipeline Totals** | **All 6 Stages** | `pending` | - | - | - | **0s** | **0** | **0** | **0** | - | **$0.0000** |

---

## 3. Resource & Cost Analytics

### 3.1 Time Distribution
- **Stage with Longest Duration**: `-` (`0s`, `0.0%` of total agent time)
- **Stage with Shortest Duration**: `-` (`0s`, `0.0%` of total agent time)
- **Average Time per Agent Stage**: `0s`
- **Orchestration & Validation Overhead**: `0s` (`Total Wall-Clock Time` minus `Sum of Agent Durations`)

### 3.2 Token Utilization Breakdown
- **Prompt / Input Token Ratio**: `0.0%`
- **Completion / Output Token Ratio**: `0.0%`
- **Cache Hit / Reuse Rate**: `0.0%`
- **Highest Token Consumption Stage**: `-` (`0` tokens, `0.0%` of run)

### 3.3 Cost Accounting Breakdown
- **Pricing Basis**:
  - Model A (`e.g., claude-3-7-sonnet`): `$3.00` / 1M prompt tokens, `$15.00` / 1M completion tokens, `$0.30` / 1M cache-read tokens
  - Model B (`e.g., gpt-4o`): `$2.50` / 1M prompt tokens, `$10.00` / 1M completion tokens, `$1.25` / 1M cache-read tokens
- **Most Expensive Stage**: `-` (`$0.0000`, `0.0%` of total cost)
- **Average Cost per Stage**: `$0.0000`
- **Cumulative Incurred Cost (USD)**: `$0.0000`

---

## 4. Detailed Stage-by-Stage Breakdown

### 4.1 Stage 01: Requirement Agent (`01-requirements`)

- **Agent Name**: Requirement Agent ([agents/01-requirement-agent.md](agents/01-requirement-agent.md))
- **Status**: `pending` \| `running` \| `blocked` \| `failed` \| `completed`
- **Revision History**: `r0001`
- **Gate Disposition**: `pass` \| `block` \| `approved_exception`

#### Timing & Execution
- **Started (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Completed / Halted (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Duration**: `0m 00s` (`0` seconds)

#### Token Usage & Cost
- **Model**: `model-name`
- **Prompt / Input Tokens**: `0`
- **Completion / Output Tokens**: `0`
- **Cache Read / Write Tokens**: `0 / 0`
- **Total Stage Tokens**: `0`
- **Prompt Cost**: `$0.0000`
- **Completion Cost**: `$0.0000`
- **Total Stage Cost**: `$0.0000`

#### Input Artifacts & Provenance
- `intake/request.md` (SHA-256: `...` \| Status: verified)
- `Docs/openapi.yaml` (SHA-256: `...` \| Status: provisional fixture schema context)

#### Output Artifacts & Deliverables
- `01-requirements/r0001/requirements.json` (SHA-256: `...`)
- `01-requirements/r0001/service-catalog.json` (SHA-256: `...`)
- `01-requirements/r0001/decisions.json` (SHA-256: `...`)
- `01-requirements/r0001/open-questions.json` (SHA-256: `...`)
- `01-requirements/r0001/requirements.md` (SHA-256: `...`)
- `01-requirements/r0001/stage-result.json` (SHA-256: `...`)

#### Quality & Gate Checks
| Check ID | Description | Status | Evidence / Note |
|---|---|---|---|
| `CHK-0101` | Acceptance criteria completeness | `passed` | All extracted requirements contain testable acceptance criteria |
| `CHK-0102` | Service boundary validation | `passed` | Explicit boundaries captured |

#### Blockers, Questions & Limitations
- **Active Blockers**: None
- **Open Questions**: `0` open questions recorded in `open-questions.json`

---

### 4.2 Stage 02: Context Builder Agent (`02-context`)

- **Agent Name**: Context Builder Agent ([agents/02-context-builder-agent.md](agents/02-context-builder-agent.md))
- **Status**: `pending` \| `running` \| `blocked` \| `failed` \| `completed`
- **Revision History**: `r0001`
- **Gate Disposition**: `pass` \| `block` \| `approved_exception`

#### Timing & Execution
- **Started (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Completed / Halted (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Duration**: `0m 00s` (`0` seconds)

#### Token Usage & Cost
- **Model**: `model-name`
- **Prompt / Input Tokens**: `0`
- **Completion / Output Tokens**: `0`
- **Cache Read / Write Tokens**: `0 / 0`
- **Total Stage Tokens**: `0`
- **Prompt Cost**: `$0.0000`
- **Completion Cost**: `$0.0000`
- **Total Stage Cost**: `$0.0000`

#### Input Artifacts & Provenance
- `01-requirements/r0001/requirements.json` (SHA-256: `...`)
- `01-requirements/r0001/service-catalog.json` (SHA-256: `...`)
- `01-requirements/r0001/decisions.json` (SHA-256: `...`)

#### Output Artifacts & Deliverables
- `02-context/r0001/service-contexts.json` (SHA-256: `...`)
- `02-context/r0001/contracts/` (SHA-256: `...`)
- `02-context/r0001/contract-index.json` (SHA-256: `...`)
- `02-context/r0001/dependency-map.json` (SHA-256: `...`)
- `02-context/r0001/traceability-matrix.json` (SHA-256: `...`)
- `02-context/r0001/context-summary.md` (SHA-256: `...`)
- `02-context/r0001/stage-result.json` (SHA-256: `...`)

#### Quality & Gate Checks
| Check ID | Description | Status | Evidence / Note |
|---|---|---|---|
| `CHK-0201` | Stack & version compatibility verification | `passed` | Verified against ecosystem manifests |
| `CHK-0202` | Native contract completeness | `passed` | Endpoints, payloads, and error schemas fully defined |

#### Blockers, Questions & Limitations
- **Active Blockers**: None

---

### 4.3 Stage 03: Code Generation Agent (`03-generation`)

- **Agent Name**: Code Generation Agent ([agents/03-code-generation-agent.md](agents/03-code-generation-agent.md))
- **Status**: `pending` \| `running` \| `blocked` \| `failed` \| `completed`
- **Revision History**: `r0001`
- **Gate Disposition**: `pass` \| `block` \| `approved_exception`

#### Timing & Execution
- **Started (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Completed / Halted (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Duration**: `0m 00s` (`0` seconds)

#### Token Usage & Cost
- **Model**: `model-name`
- **Prompt / Input Tokens**: `0`
- **Completion / Output Tokens**: `0`
- **Cache Read / Write Tokens**: `0 / 0`
- **Total Stage Tokens**: `0`
- **Prompt Cost**: `$0.0000`
- **Completion Cost**: `$0.0000`
- **Total Stage Cost**: `$0.0000`

#### Input Artifacts & Provenance
- `01-requirements/r0001/requirements.json` (SHA-256: `...`)
- `02-context/r0001/service-contexts.json` (SHA-256: `...`)
- `02-context/r0001/contract-index.json` (SHA-256: `...`)

#### Output Artifacts & Deliverables
- Target repository files in authorized write scopes
- `03-generation/r0001/generated-files.json` (SHA-256: `...`)
- `03-generation/r0001/implementation-traceability.json` (SHA-256: `...`)
- `03-generation/r0001/dependency-changes.json` (SHA-256: `...`)
- `03-generation/r0001/validation-results.json` (SHA-256: `...`)
- `03-generation/r0001/generation-summary.md` (SHA-256: `...`)
- `03-generation/r0001/stage-result.json` (SHA-256: `...`)

#### Quality & Gate Checks
| Check ID | Description | Status | Evidence / Note |
|---|---|---|---|
| `CHK-0301` | Syntax and compilation check | `passed` | Narrow build / compilation succeeded |
| `CHK-0302` | Type check and lint validation | `passed` | No blocking type or lint errors |

#### Blockers, Questions & Limitations
- **Active Blockers**: None

---

### 4.4 Stage 04: Code Review Agent (`04-review`)

- **Agent Name**: Code Review Agent ([agents/04-code-review-agent.md](agents/04-code-review-agent.md))
- **Status**: `pending` \| `running` \| `blocked` \| `failed` \| `completed`
- **Revision History**: `r0001`
- **Gate Disposition**: `pass` \| `block` \| `approved_exception`

#### Timing & Execution
- **Started (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Completed / Halted (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Duration**: `0m 00s` (`0` seconds)

#### Token Usage & Cost
- **Model**: `model-name`
- **Prompt / Input Tokens**: `0`
- **Completion / Output Tokens**: `0`
- **Cache Read / Write Tokens**: `0 / 0`
- **Total Stage Tokens**: `0`
- **Prompt Cost**: `$0.0000`
- **Completion Cost**: `$0.0000`
- **Total Stage Cost**: `$0.0000`

#### Input Artifacts & Provenance
- `01-requirements/r0001/requirements.json` (SHA-256: `...`)
- `02-context/r0001/service-contexts.json` (SHA-256: `...`)
- `03-generation/r0001/generated-files.json` (SHA-256: `...`)
- `03-generation/r0001/validation-results.json` (SHA-256: `...`)

#### Output Artifacts & Deliverables
- `04-review/r0001/review-findings.json` (SHA-256: `...`)
- `04-review/r0001/review-checks.json` (SHA-256: `...`)
- `04-review/r0001/review-report.md` (SHA-256: `...`)
- `04-review/r0001/stage-result.json` (SHA-256: `...`)

#### Quality & Gate Checks
| Check ID | Description | Status | Evidence / Note |
|---|---|---|---|
| `CHK-0401` | Security vulnerability scan | `passed` | Zero high/critical security findings |
| `CHK-0402` | Contract compliance inspection | `passed` | Boundary contracts match implementation |

#### Findings Summary
| Severity | Total Count | Blocking Count | Non-blocking Count | Resolved Count |
|---|---:|---:|---:|---:|
| `critical` | 0 | 0 | 0 | 0 |
| `high` | 0 | 0 | 0 | 0 |
| `medium` | 0 | 0 | 0 | 0 |
| `low` | 0 | 0 | 0 | 0 |
| `info` | 0 | 0 | 0 | 0 |

---

### 4.5 Stage 05: Test Case Agent (`05-tests`)

- **Agent Name**: Test Case Agent ([agents/05-test-case-agent.md](agents/05-test-case-agent.md))
- **Status**: `pending` \| `running` \| `blocked` \| `failed` \| `completed`
- **Revision History**: `r0001`
- **Gate Disposition**: `pass` \| `block` \| `approved_exception`

#### Timing & Execution
- **Started (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Completed / Halted (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Duration**: `0m 00s` (`0` seconds)

#### Token Usage & Cost
- **Model**: `model-name`
- **Prompt / Input Tokens**: `0`
- **Completion / Output Tokens**: `0`
- **Cache Read / Write Tokens**: `0 / 0`
- **Total Stage Tokens**: `0`
- **Prompt Cost**: `$0.0000`
- **Completion Cost**: `$0.0000`
- **Total Stage Cost**: `$0.0000`

#### Input Artifacts & Provenance
- `01-requirements/r0001/requirements.json` (SHA-256: `...`)
- `02-context/r0001/service-contexts.json` (SHA-256: `...`)
- `03-generation/r0001/generated-files.json` (SHA-256: `...`)
- `04-review/r0001/stage-result.json` (SHA-256: `...`)

#### Output Artifacts & Deliverables
- Target repository test suite files in authorized write scopes
- `05-tests/r0001/test-plan.json` (SHA-256: `...`)
- `05-tests/r0001/test-cases.json` (SHA-256: `...`)
- `05-tests/r0001/test-files.json` (SHA-256: `...`)
- `05-tests/r0001/test-results.json` (SHA-256: `...`)
- `05-tests/r0001/coverage-matrix.json` (SHA-256: `...`)
- `05-tests/r0001/test-report.md` (SHA-256: `...`)
- `05-tests/r0001/stage-result.json` (SHA-256: `...`)

#### Quality & Gate Checks
| Check ID | Description | Status | Evidence / Note |
|---|---|---|---|
| `CHK-0501` | Unit & integration test execution | `passed` | 100% tests passed in authorized test environment |
| `CHK-0502` | Line & branch coverage gate | `passed` | Meets threshold defined in policy |

#### Test Execution Metrics
- **Tests Authored**: `0`
- **Tests Executed**: `0`
- **Tests Passed**: `0`
- **Tests Failed**: `0`
- **Tests Skipped / Not Run**: `0`
- **Measured Line Coverage**: `0.0%`
- **Measured Branch Coverage**: `0.0%`

---

### 4.6 Stage 06: Postman Agent (`06-postman`)

- **Agent Name**: Postman Agent ([agents/06-postman-agent.md](agents/06-postman-agent.md))
- **Status**: `pending` \| `running` \| `blocked` \| `failed` \| `completed`
- **Revision History**: `r0001`
- **Gate Disposition**: `pass` \| `block` \| `approved_exception`

#### Timing & Execution
- **Started (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Completed / Halted (UTC)**: `YYYY-MM-DDTHH:MM:SSZ`
- **Duration**: `0m 00s` (`0` seconds)

#### Token Usage & Cost
- **Model**: `model-name`
- **Prompt / Input Tokens**: `0`
- **Completion / Output Tokens**: `0`
- **Cache Read / Write Tokens**: `0 / 0`
- **Total Stage Tokens**: `0`
- **Prompt Cost**: `$0.0000`
- **Completion Cost**: `$0.0000`
- **Total Stage Cost**: `$0.0000`

#### Input Artifacts & Provenance
- `01-requirements/r0001/requirements.json` (SHA-256: `...`)
- `02-context/r0001/contract-index.json` (SHA-256: `...`)
- `03-generation/r0001/generated-files.json` (SHA-256: `...`)
- `05-tests/r0001/test-cases.json` (SHA-256: `...`)

#### Output Artifacts & Deliverables
- `06-postman/r0001/collections/` (Native Postman v2.1 collections)
- `06-postman/r0001/environments/` (Safe environment templates)
- `06-postman/r0001/postman-index.json` (SHA-256: `...`)
- `06-postman/r0001/api-coverage.json` (SHA-256: `...`)
- `06-postman/r0001/unsupported-interfaces.json` (SHA-256: `...`)
- `06-postman/r0001/postman-results.json` (SHA-256: `...`)
- `06-postman/r0001/postman-summary.md` (SHA-256: `...`)
- `06-postman/r0001/stage-result.json` (SHA-256: `...`)

#### Quality & Gate Checks
| Check ID | Description | Status | Evidence / Note |
|---|---|---|---|
| `CHK-0601` | Postman Collection Schema v2.1 validation | `passed` | Passed schema validation |
| `CHK-0602` | API operation coverage | `passed` | 100% of supported HTTP endpoints covered |

---

## 5. Machine-Readable Schema Specification

To ensure interoperability with orchestration runners, dashboards, and automated accounting, the pipeline defines a structured schema for stage execution metrics inside `stage-result.json` and the aggregate `execution-metrics.json`.

### 5.1 Common `stage-result.json` Execution Metrics Extension

Each stage's `stage-result.json` must include the `execution_metrics` block:

```json
{
  "schema_version": "1.0",
  "run_id": "example-run-20261012-001",
  "stage_id": "01-requirements",
  "revision": 1,
  "status": "completed",
  "service_ids": ["orders", "inventory"],
  "execution_metrics": {
    "agent_name": "Requirement Agent",
    "model_id": "claude-3-7-sonnet-20250219",
    "started_at": "2026-10-12T10:00:00Z",
    "completed_at": "2026-10-12T10:02:15Z",
    "duration_seconds": 135,
    "duration_human": "2m 15s",
    "token_usage": {
      "prompt_tokens": 14250,
      "completion_tokens": 3840,
      "cache_read_tokens": 5200,
      "cache_write_tokens": 1200,
      "total_tokens": 18090
    },
    "cost_usd": {
      "prompt_cost": 0.04275,
      "completion_cost": 0.05760,
      "cache_cost": 0.00156,
      "total_cost": 0.10191,
      "pricing_basis": "prompt=$3/1M, completion=$15/1M, cache_read=$0.30/1M"
    }
  },
  "input_artifacts": [],
  "output_artifacts": [],
  "approved_decision_refs": [],
  "blockers": [],
  "checks": [],
  "gate": {"disposition": "pass", "approval_refs": []},
  "next_stage": "02-context",
  "handoff_eligible": true
}
```

### 5.2 Aggregate `execution-metrics.json` Contract

The orchestrator aggregates all stage metrics into `artifacts/<run-id>/execution-metrics.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "schema_version": "1.0",
  "run_id": "example-run-20261012-001",
  "pipeline_status": "completed",
  "current_stage": "06-postman",
  "started_at": "2026-10-12T10:00:00Z",
  "last_updated_at": "2026-10-12T10:24:45Z",
  "timing_summary": {
    "wall_clock_duration_seconds": 1485,
    "wall_clock_duration_human": "24m 45s",
    "cumulative_agent_duration_seconds": 1320,
    "cumulative_agent_duration_human": "22m 00s",
    "orchestrator_overhead_seconds": 165,
    "orchestrator_overhead_human": "2m 45s"
  },
  "token_summary": {
    "total_prompt_tokens": 125400,
    "total_completion_tokens": 48200,
    "total_cache_read_tokens": 85000,
    "total_cache_write_tokens": 14500,
    "total_pipeline_tokens": 173600
  },
  "cost_summary": {
    "currency": "USD",
    "total_prompt_cost_usd": 0.3762,
    "total_completion_cost_usd": 0.7230,
    "total_cache_cost_usd": 0.0255,
    "total_pipeline_cost_usd": 1.1247
  },
  "stages": [
    {
      "stage_id": "01-requirements",
      "agent_name": "Requirement Agent",
      "status": "completed",
      "revision": 1,
      "gate": "pass",
      "duration_seconds": 135,
      "total_tokens": 18090,
      "total_cost_usd": 0.1019
    },
    {
      "stage_id": "02-context",
      "agent_name": "Context Builder Agent",
      "status": "completed",
      "revision": 1,
      "gate": "pass",
      "duration_seconds": 210,
      "total_tokens": 28450,
      "total_cost_usd": 0.1852
    },
    {
      "stage_id": "03-generation",
      "agent_name": "Code Generation Agent",
      "status": "completed",
      "revision": 1,
      "gate": "pass",
      "duration_seconds": 450,
      "total_tokens": 58300,
      "total_cost_usd": 0.4120
    },
    {
      "stage_id": "04-review",
      "agent_name": "Code Review Agent",
      "status": "completed",
      "revision": 1,
      "gate": "pass",
      "duration_seconds": 180,
      "total_tokens": 24100,
      "total_cost_usd": 0.1540
    },
    {
      "stage_id": "05-tests",
      "agent_name": "Test Case Agent",
      "status": "completed",
      "revision": 1,
      "gate": "pass",
      "duration_seconds": 225,
      "total_tokens": 31200,
      "total_cost_usd": 0.1985
    },
    {
      "stage_id": "06-postman",
      "agent_name": "Postman Agent",
      "status": "completed",
      "revision": 1,
      "gate": "pass",
      "duration_seconds": 120,
      "total_tokens": 13460,
      "total_cost_usd": 0.0731
    }
  ]
}
```

---

## 6. Lifecycle Synchronization Rules

1. **Initialization**: When initializing a run under `artifacts/<run-id>/`, create `detailed-status.md` and `execution-metrics.json` alongside `manifest.json` and `live-status.md`.
2. **Stage Start**: When a stage starts execution, record the `Started (UTC)` timestamp, set status to `running`, and update the current stage.
3. **Stage Completion / Interruption**: When a stage finishes (whether `completed`, `blocked`, or `failed`), extract the `execution_metrics` from `stage-result.json` (or calculate via runner wrapper), record the `Ended (UTC)` timestamp, elapsed duration, token counts, model pricing basis, and computed cost.
4. **Totals Recalculation**: Immediately update the top-level snapshot, summary tables, time distributions, token totals, and cumulative dollar costs.
5. **Multi-Revision / Retries**: If a stage fails or is blocked and subsequently retried in a new revision (e.g., `r0002`), preserve the historical metrics of prior revisions and reflect the sum of all revisions under the stage summary while detailing each revision attempt in the stage breakdown.
6. **Final Acceptance**: On pipeline completion, verify that the sum of all stage costs, tokens, and durations accurately matches the totals in `detailed-status.md`, `execution-metrics.json`, and [agents/orchestrator.md](agents/orchestrator.md)'s `completion-report.md`.
