# Live Agent Status Checklist

Initialize one copy at `artifacts/<run-id>/live-status.md` for each run. The orchestrator owns and updates it; specialist agents report results but do not edit it. Keep it synchronized with `manifest.json` and append status-change evidence to `history/`.

## Run Snapshot

- Run ID:
- Overall status: `pending` | `running` | `blocked` | `failed` | `completed`
- Current stage: `01-requirements` | `02-context` | `03-generation` | `04-review` | `05-tests` | `06-postman` | `null`
- Last updated (UTC):
- Manifest: `manifest.json`
- Latest history event:

## Stage Status

Use only `pending`, `running`, `blocked`, `failed`, or `completed` for stage status. `completed` means the candidate result passed validation and its gate was accepted by the orchestrator; an agent returning a completed result alone is not acceptance. Statuses and gates must be supported by persisted evidence.

| Stage | Agent | Status | Revision | Started (UTC) | Updated (UTC) | Gate | Result / blocker references | Activity |
|---|---|---|---:|---|---|---|---|---|
| 01-requirements | Requirement Agent | pending | - | - | - | - | - | - |
| 02-context | Context Builder Agent | pending | - | - | - | - | - | - |
| 03-generation | Code Generation Agent | pending | - | - | - | - | - | - |
| 04-review | Code Review Agent | pending | - | - | - | - | - | - |
| 05-tests | Test Case Agent | pending | - | - | - | - | - | - |
| 06-postman | Postman Agent | pending | - | - | - | - | - | - |

## Run Checklist

### Before Starting

- [ ] Intake, run configuration, write scopes, decision authority, and gate policy are persisted and validated.
- [ ] Run ID and artifact root are unique; manifest and initial history are created.
- [ ] Shared OpenAPI baseline is pinned as provisional schema context, not treated as an approved API contract.
- [ ] Live status table matches the initial manifest; all stages are `pending`.

### For Each Stage

- [ ] Confirm all required predecessor revisions are accepted, current, and fingerprint-valid.
- [ ] Allocate a fresh revision and persist invocation bindings before starting the agent.
- [ ] Set the stage and run to `running`; record revision, start/update timestamps, and current stage in the manifest and this file.
- [ ] Record meaningful activity checkpoints or blockers with UTC update time and evidence reference; do not fabricate heartbeat or progress.
- [ ] On return, validate identity, outputs, input freshness, checks, approvals, gate, and artifact fingerprints.
- [ ] Record the actual `blocked`, `failed`, or accepted `completed` status, gate, result reference, and blocker references in the manifest, checklist, and history.
- [ ] If blocked or failed, stop downstream work and keep downstream stages pending or mark impacted acceptances invalidated.
- [ ] Before advancing, confirm the current revision is accepted and the next stage is still the immediate sequential stage.

### Before Closing the Run

- [ ] All six current stage revisions are accepted, or the run is explicitly left blocked/failed/incomplete.
- [ ] Invalidated or stale acceptances are not represented as current or completed.
- [ ] All unrun checks, approved exceptions, unsupported coverage, and unresolved limitations remain visible.
- [ ] Manifest, live status, immutable history, blocker index, and completion report agree.
- [ ] Set overall status to `completed` only when every required stage is accepted; otherwise report the actual state.

## Status Rules

- `pending`: not yet invoked in this run/revision.
- `running`: invocation has started and has not returned a validated result.
- `blocked`: progress cannot continue because required information, approval, artifact, or environment is unavailable.
- `failed`: attempted work or a required check failed; remediation/authorization is needed.
- `completed`: orchestrator validated and accepted the revision with a `pass` gate or valid scoped `approved_exception`.

A gate of `block` never permits advancement. `not_run` is not `passed`. Retries require persisted resolution and authorization and use a fresh revision; retain prior rows/events for audit rather than overwriting history.
