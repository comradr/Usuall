# QA · Обычный день · S02–S03

**NATIVE_CHECKS_PASS_BROWSER_NOT_CHECKED**. Scope: two scenes, 189 seconds.

Deterministic regression: **33 PASS / 0 FAIL**.

Checked the actual model and production renderer with measured exported PNG sockets, native Canvas, injected clock and simulated storage. The default production loader was also exercised through createGame without injected assets; filesystem-backed fetch/image substitutes verified every resolved asset path.

Evidence separates every forced authored pose/frame audit from timeline replay. The chronology montage is accelerated, omits quiet gaps and has no audio. Four additional native offscreen clips play the actual walk, chalk and teacher phone windows at the original story rate; these also have no audio.

Captured 360 timeline PNG/state records, 52 forced authored frames and 23 contact neighborhoods. GIF: 39.7 seconds, 397 decoded frames, 397 distinct frames.

| Check | Outcome |
|---|---|
| CANON-01: The playable story contains exactly S02/S03, 15 continuous shots and 189 seconds | PASS |
| CANON-02: Five exact original messages retain IDs, speakers, text and order | PASS |
| API-01: The real model is importable without browser globals | PASS |
| API-02: The real renderer/clock are importable without browser globals | PASS |
| ASSET-01: Actual PNGs have native dimensions, alpha, distinct frames and measured opaque hand sockets | PASS |
| ASSET-02: Default createGame loader resolves every manifest image to an existing dist file | PASS |
| WORLD-01: Every 60 Hz sample conserves the one loaf through all ownership transfers | PASS |
| WORLD-02: Scene boundary preserves packed loaf, board and message state | PASS |
| NAR-01: No phone before break or while carrying bread; five messages follow physical phone actions | PASS |
| NAR-02: Chalk contact precedes visible progress and completed arithmetic persists | PASS |
| NAR-03: Teacher phone starts after pupils leave and remains held for each canonical send | PASS |
| SAVE-01: Reload roundtrip preserves ownership, chalk and chat at eleven intermediate/end times | PASS |
| SAVE-02: Malformed, stale, oversized and non-finite save data fail closed | PASS |
| SAVE-03: Blocked storage and quota errors do not throw or overwrite the last valid save | PASS |
| SAVE-04: Unsupported preferences are sanitized into supported finite values | PASS |
| WORLD-03: Non-finite/out-of-range timeline input remains inside the supported fragment | PASS |
| GEO-01: Held loaf and phone attach to the actual bitmap frame hand, not a synthetic target | PASS |
| GEO-02: All six ownership boundaries touch the prior/new object anchor within three native pixels | PASS |
| GEO-03: Drawing chalk remains at the actual hand while both feet remain on the board floor plane | PASS |
| GEO-06: Lifted writing hand stays near the board between strokes instead of falling to the hip | PASS |
| GEO-04: Main actor feet route around the real background furniture at every 60 Hz sample | PASS |
| GEO-05: Walking pupils avoid furniture except the short approach/exit to their own seated desk | PASS |
| RENDER-01: Every rendered store frame draws exactly six loaf images with one moving owner | PASS |
| RENDER-02: The raised pupil hand changes visible pixels above the head after furniture occlusion | PASS |
| RENDER-03: Completed arithmetic renders the equals sign as two separate visible horizontal lines | PASS |
| RENDER-04: Notebook and correction strokes contribute visible pixels after tabletop occlusion | PASS |
| CLOCK-01: Pause freezes story time and resume cannot consume the paused wall-clock gap | PASS |
| CLOCK-02: Supported playback speeds change wall-clock rate while stalls remain bounded | PASS |
| CLOCK-03: Repeated player advance is continuous, visits every owner, and emits cues once | PASS |
| CLOCK-04: Resume restores a mid-action save and reduced motion preserves physical and message state | PASS |
| CLOCK-05: Quota failures produce one notice and gameplay keeps running | PASS |
| CLOCK-SAVE-01: Every irreversible message/cue/scene/prop boundary commits before a fresh game resumes | PASS |
| SOURCE-01: Regression evidence still matches every model/renderer/manifest file loaded by this run | PASS |

## NOT_CHECKED

- Real browser launch, HTML/CSS layout, mobile DOM, PIP and touch input.
- Browser audio output/listening, autoplay policy and browser/device performance.
- Whole game outside S02–S03. Artistic quality is not certified by these tests.

The 320 px PNGs show only nearest-neighbor scaled world rendering. They do not prove responsive UI.

## Commands actually used

- `node tests/regression.mjs` — exit 0, Node, injected clock/storage, no browser.
- `node tests/capture-offscreen.mjs` — exit 0, Native Canvas plus Pillow export; no browser.
- `node tests/qa-report.mjs` — exit 0, Evidence/source SHA-256 crosscheck.

## Evidence integrity

Regression, source, atlas and captured evidence SHA-256 agree at report creation.

Exact hashes, file paths, assertions and capture parameters are in `qa-report.json`, `qa-regression.json` and `qa-captures/index.json`.
