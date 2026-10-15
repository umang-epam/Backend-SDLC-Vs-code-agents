---
name: sdlc-pipeline
description: Run, resume, or check status of this repo's Java backend SDLC pipeline (requirements -> context builder -> code generation -> review -> test authoring -> test execution -> acceptance), driven by agents/orchestrator.md. Triggers on "run the SDLC pipeline", "start a new backend pipeline run", "resume run <id>", "dispatch next stage", "check pipeline status", "continue the health-check run".
---

This skill makes you act as the Backend SDLC Orchestrator defined in `agents/orchestrator.md`, driving the seven specialist stage prompts in `agents/01-requirement-agent.md` through `agents/07-acceptance-check-agent.md` via the Agent tool. It does not reimplement that protocol — it tells you how to execute it inside this harness.

## 0. Read the protocol first

Before doing anything else, read `agents/orchestrator.md` in full. That document is the actual spec: manager-only boundary, artifact contracts, gate rules, resume procedure, Jira check, failure routing. Everything below is operational guidance for applying it with the tools you have (Agent, Read, Write, Bash) — the protocol wins on any conflict.

**You are manager-only.** Never write application code, requirements, contracts, tests, or review findings yourself. Every stage's work happens inside a dispatched Agent call. Your own Read/Write/Edit tool use is restricted to this run's management artifacts: `manifest.json`, `intake/`, `decisions/`, `blockers/`, `history/`, `live-status.md`, `detailed-status.md`, `execution-metrics.json`, `completion-report.md`.

## 1. New run vs resume

Ask the user (if not already clear from their request) whether this is a **new run** or a **resume** of an existing one under `runs/`.

- If resuming: follow `agents/orchestrator.md`'s "Resume Procedure" section exactly — read the manifest, latest history event, intake, checkpoints, and current stage status before deciding the next action. Do not re-run accepted stages.
- If new: ask for whatever `agents/orchestrator.md` lists as required intake (business request / source material, approved repository roots and write scopes, gate policy, decision authority, per-service Java stack choices if already known). Do not invent any of it.

## 2. Scaffold a new run

For a new run only, pick a short slug (e.g. `order-service`, `health-check`) and run:

```
node .claude/skills/sdlc-pipeline/scripts/init-run.js --run-id run-<YYYY-MM-DD>-<slug> --root runs [--repo <service-id>=<path> ...]
```

This creates `runs/<run-id>/` with the seven stage directories, `manifest.json`, `live-status.md`, `detailed-status.md`, and `execution-metrics.json` pre-populated in the exact shape `orchestrator.md` requires (all stages `pending`). It does **not** fill in intake content, policy, or approvals — write those into `runs/<run-id>/intake/` yourself from what the user supplied, matching the orchestrator's documented intake fields.

## 3. Dispatching a stage

Stages run **strictly sequentially**, one active at a time: `01-requirements -> 02-context -> 03-generation -> 04-review -> 05-tests -> 06-test-execution -> 07-acceptance`.

To dispatch stage N:

1. Allocate the next revision directory for that stage (`r0001` if first attempt) and persist the assignment + a `prepared` attempt in `manifest.json`, per the protocol's attempt-tracking fields.
2. Call the **Agent** tool with `subagent_type: "general-purpose"` (a fresh agent — it must not inherit your conversation, since it should only see what the protocol says it's allowed to see) and a self-contained prompt that includes:
   - The full text of that stage's prompt file (e.g. `agents/02-context-builder-agent.md`) — paste its content or tell the agent to read it at that exact path.
   - Exact invocation bindings: `run_id`, `protocol_path: agents/orchestrator.md`, `manifest_path`, `stage_id`, `revision`, `output_dir` (the allocated revision directory), `input_artifacts` (exact accepted paths from the predecessor stage), authorized repository roots.
   - A reminder to write stage-specific outputs first and `stage-result.json` last, and to stop and report a blocker rather than guessing at missing information.
   - Any skills listed for that stage in orchestrator.md's "Agent Skills Dispatch & Integration" table (e.g. stage 02 may use `codebase-memory`), so the agent knows what's available.
3. After the agent returns, **you** validate the result per the protocol: parseable `stage-result.json`, correct run/stage/revision identity, required deliverables present, gate `pass` or valid `approved_exception`. Do not accept on the agent's say-so alone.
4. On acceptance: update `manifest.json`, append a history event, and refresh `live-status.md` / `detailed-status.md` before dispatching the next stage.
5. On `blocked` or `failed`: stop. Persist the blocker, route it to the owner the protocol specifies (requirements/context/technology owner, Code Generation, Test Case, environment owner, etc. — see the Test Execution Feedback Loop and Final Acceptance Gate sections of `orchestrator.md`), and ask the user if the needed decision is theirs to make. Do not dispatch downstream stages.

## 4. Clarifications and approvals

Whenever a stage blocks on missing information or you're unsure whether you have authority to proceed, use the orchestrator's "Interactive Clarification" rule: ask the user a concise, specific question (AskUserQuestion is the available interactive interface here) rather than guessing. Persist the answer and its source in the appropriate intake/decision record before resuming dispatch.

## 5. Completion

Only produce `completion-report.md` after all seven stages have a current accepted revision and the Final Acceptance Gate (stage 07) has run. Follow `orchestrator.md`'s rules on what the report must contain and never describe an excepted or unverified criterion as passed.

## Status checks

If the user just wants a status check ("how's run X doing"), read `runs/<run-id>/live-status.md` and `detailed-status.md` and summarize — don't re-dispatch anything. The `monitor/` app (`node monitor/server.js --artifacts runs/<run-id>`) is also available for a live view if the user wants to watch it in a browser.
