# Postman Stage Summary (Blocked)

- run_id: manual-run-20261009-001
- stage_id: 06-postman
- revision: r0001
- status: blocked

## Why blocked

1. No orchestrator invocation binding was supplied for this stage (`run_id`, `manifest_path`, `protocol_path`, accepted input artifacts, and gate policy references).
2. No accepted stage artifacts from `01-requirements` through `05-tests` were found in the workspace.
3. `Docs/openapi.yaml` is provisional and has no operation paths, so it cannot be used as the source of Postman request definitions.

## What is needed to continue

1. Supply accepted artifacts from stages 01-05 with exact revision paths.
2. Supply or create orchestrator run state (`manifest.json`, invocation file, and policy refs).
3. Re-run stage 06 with those references to produce collection and environment artifacts.
