# QA · deterministic regression

Status: **PASS**. 12 passed, 0 failed.

Command: `node tests/regression.mjs --model-only` from `/workspace/sites/obychnyy-den`. Node `v24.19.0`.

These tests exercise the real model and injected game clock/storage. They do not run in a browser.

| ID | Purpose | Outcome |
|---|---|---|
| CANON-01 | The playable story contains exactly S02/S03, 15 continuous shots and 189 seconds | PASS |
| CANON-02 | Five exact original messages retain IDs, speakers, text and order | PASS |
| API-01 | The real model is importable without browser globals | PASS |
| WORLD-01 | Every 60 Hz sample conserves the one loaf through all ownership transfers | PASS |
| WORLD-02 | Scene boundary preserves packed loaf, board and message state | PASS |
| NAR-01 | No phone before break or while carrying bread; five messages follow physical phone actions | PASS |
| NAR-02 | Chalk contact precedes visible progress and completed arithmetic persists | PASS |
| SAVE-01 | Reload roundtrip preserves ownership, chalk and chat at eleven intermediate/end times | PASS |
| SAVE-02 | Malformed, stale, oversized and non-finite save data fail closed | PASS |
| SAVE-03 | Blocked storage and quota errors do not throw or overwrite the last valid save | PASS |
| SAVE-04 | Unsupported preferences are sanitized into supported finite values | PASS |
| WORLD-03 | Non-finite/out-of-range timeline input remains inside the supported fragment | PASS |

## Findings

No deterministic regression failure was observed in the checked scope.

## NOT_CHECKED

- Real browser startup, HTML/CSS layout and mobile text readability
- Touch/keyboard events, PIP/focus overlays and DOM controls
- Actual browser audio output and autoplay policy
- Browser FPS and real tab suspension
- Complete game outside S02–S03
- Artistic sign-off (separate independent critic)

Full assertions, sampled-frame counts, source SHA-256 and errors are in `qa-model-regression.json`.
