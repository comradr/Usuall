# QA · deterministic regression

Status: **FAIL**. 24 passed, 2 failed.

Command: `node tests/regression.mjs --preliminary` from `/workspace/sites/obychnyy-den`. Node `v24.19.0`.

These tests exercise the real model and injected game clock/storage. They do not run in a browser.

| ID | Purpose | Outcome |
|---|---|---|
| CANON-01 | The playable story contains exactly S02/S03, 15 continuous shots and 189 seconds | PASS |
| CANON-02 | Five exact original messages retain IDs, speakers, text and order | PASS |
| API-01 | The real model is importable without browser globals | PASS |
| API-02 | The real renderer/clock are importable without browser globals | PASS |
| ASSET-01 | Actual PNGs have native dimensions, alpha, distinct frames and measured opaque hand sockets | PASS |
| ASSET-02 | Default createGame loader resolves every manifest image to an existing dist file | PASS |
| WORLD-01 | Every 60 Hz sample conserves the one loaf through all ownership transfers | PASS |
| WORLD-02 | Scene boundary preserves packed loaf, board and message state | PASS |
| NAR-01 | No phone before break or while carrying bread; five messages follow physical phone actions | PASS |
| NAR-02 | Chalk contact precedes visible progress and completed arithmetic persists | PASS |
| SAVE-01 | Reload roundtrip preserves ownership, chalk and chat at eleven intermediate/end times | PASS |
| SAVE-02 | Malformed, stale, oversized and non-finite save data fail closed | PASS |
| SAVE-03 | Blocked storage and quota errors do not throw or overwrite the last valid save | PASS |
| SAVE-04 | Unsupported preferences are sanitized into supported finite values | PASS |
| WORLD-03 | Non-finite/out-of-range timeline input remains inside the supported fragment | PASS |
| GEO-01 | Held loaf and phone attach to the actual bitmap frame hand, not a synthetic target | PASS |
| GEO-02 | All six ownership boundaries touch the prior/new object anchor within three native pixels | FAIL |
| GEO-03 | Drawing chalk remains at the actual hand while both feet remain on the board floor plane | FAIL |
| GEO-04 | Main actor feet route around the real background furniture at every 60 Hz sample | PASS |
| RENDER-01 | Every rendered store frame draws exactly six loaf images with one moving owner | PASS |
| CLOCK-01 | Pause freezes story time and resume cannot consume the paused wall-clock gap | PASS |
| CLOCK-02 | Supported playback speeds change wall-clock rate while stalls remain bounded | PASS |
| CLOCK-03 | Repeated player advance is continuous, visits every owner, and emits cues once | PASS |
| CLOCK-04 | Resume restores a mid-action save and reduced motion preserves physical and message state | PASS |
| CLOCK-05 | Quota failures produce one notice and gameplay keeps running | PASS |
| SOURCE-01 | Regression evidence still matches every model/renderer/manifest file loaded by this run | PASS |

## Findings

- GEO-02: No new contact at 32: 11.18 px
- GEO-03: Chalk tip is 8.01 px away from actual bitmap hand at 35.016666666666666

## NOT_CHECKED

- Real browser startup, HTML/CSS layout and mobile text readability
- Touch/keyboard events, PIP/focus overlays and DOM controls
- Actual browser audio output and autoplay policy
- Browser FPS and real tab suspension
- Complete game outside S02–S03
- Artistic sign-off (separate independent critic)

Full assertions, sampled-frame counts, source SHA-256 and errors are in `qa-regression-preliminary.json`.
