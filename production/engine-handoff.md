# Engine handoff — S02/S03, 0.1.0

Runtime: `dist/engine.js`. Pure canonical timeline: `dist/model.js`. Reproducible source snapshots: `src/build-engine-runtime.js` and `src/build-engine-model.js`; run `node src/build-engine.mjs` to copy them to the static build. UI and asset builders have separate owners.

The milestone is 189 seconds: S02 (102 seconds), S03 (87 seconds). It is not the full 11-scene game. Each world has its own ordered action queue evaluated from the same deterministic elapsed clock. `stateAt(t)` reconstructs all actors, chalk strokes, bread ownership and the exact prefix of the five source messages without replaying intermediate mutations. The bread source loses one loaf at the grab; the same tracked loaf becomes packed, staged, transferred through hands to the trolley, picked up and placed once on the shelf. There is no relationship score, branching or additional invented dialogue.

`buildGeometry(manifest)` explicitly adapts nested measured art anchors and every frame's native hand socket. It selects the authored walking and carrying frames, a crouched trolley contact, and the raised shelf contact. Walking phase follows route distance; leg quality is independently reviewed by the critic. Main actors are alpha sprite atlases; backgrounds do not contain their duplicated portraits. Renderer `renderFrame(ctx,state,side,assets,options)` is shared with native offscreen QA. The shelf item is drawn in front of the shelf occlusion face. Pupil animation is original anonymous code-native pixel art.

Chalk is a six-pixel handwritten glyph font for `7 + 5 = 12`, quantized to real authored tip heights 115, 122 and 131 at fixed floor y=197. It uses separate high/middle/low sprites. Stationary pen lifts retain these raised-arm sprites. Travel between glyphs uses new authored `chalkStep` frames 24–27, selected by route distance; their baked chalk is drawn once. The new frames have grip sockets distinct from their chalk-tip sockets, and stay around the middle height. No arm stretching or vertical foot translation substitutes for hand-height art. The visual critic must still judge legibility, arm movement and ambiguous leg phases; mechanical contact tolerance does not certify drawing quality.

The bag is visible opening and enclosing the held loaf before the packed prop replaces it. Vova uses authored empty-hand phone reach and phone-return poses; the phone already embedded in frame 7 is not drawn twice. Nastya uses the new dedicated stand, bend, settle, pocket-contact, low, hold and typing sprites 16–23. Finite actions use authored frame durations. Her phone is one separate prop with one owner, follows the measured real hand socket, and first becomes visible at the pocket contact at 130.65 seconds, after the last pupil exits. It remains visible at the return-pocket pose before becoming hidden there. The five exact message times and texts are unchanged; Nastya is in typing frame 20 at 136, 170 and 176 seconds.

The chair is a permanent, independent world object at `[235,242]`, with hip/seat contact `[254,218]`. It renders at fixed depth throughout 0–189 seconds. Its native 25×35 pixels are scaled with nearest neighbour to 29×40; top `[235,202]`, seat at y218 and floor y242. This replaces the former chair that appeared only with the seated pose. The actual 71-second notebook is drawn after the upper-left desk furniture mask, then Nastya's unchanged contacting forearm is depth-split over the tabletop. The correction stroke persists from 71 through 78 seconds.

## Authored phone action boundaries

| Phase | Times, seconds | Sprite frames |
|---|---|---|
| Sit | 130 → 130.18 → 130.43 → 130.65 | 23 → 22 → 16 |
| Pocket take | 130.65 → 130.85 → 131.05 → 131.31 | 17 → 18 → 19; phone visible at 130.65 |
| Hold | 131.31 onward between typing actions | 19 |
| Type first message | 135.7 → 135.92 → 136.08 → 136.3 | 19 → 20 → 19 |
| Type bread reply | 169.7 → 169.92 → 170.08 → 170.3 | 19 → 20 → 19 |
| Type final message | 175.7 → 175.92 → 176.08 → 176.3 | 19 → 20 → 19 |
| Pocket return | 178 → 178.22 → 178.44 → 178.66 | 19 → 18 → 21; phone hidden at 178.66 |
| Rise | 178.66 → 178.84 → 179.14 → 179.36 | 21 → 22 → 23 |
| Stand, then walk | 179.36 → 183 → 189 | 23, then the original walking frames |

Public API: `await createGame({storeCanvas,schoolCanvas,onUpdate,onEvent})`, then `start({resume})`, `pause()`, `resume()`, `restart()`, `setSpeed(1|1.5|2)`, `setMuted(bool)`, `setReducedMotion(bool)`, `fastForward()`, `serialize()` and `destroy()`. Snapshot phases are `ready`, `playing`, `paused`, `complete`. Ready snapshot is delivered before creation resolves. Fast-forward continuously accelerates only to the current beat's end and never jumps over action states. Optional canvas hotspots trigger the same advance. Debug methods: `getSnapshot()`, `stateAt(t)`, `renderAt(t)`, `seek(t)`, `tick(now)`. Browser exposes `window.__game`.

Persistence uses version-1 localStorage records with a model identifier, elapsed time and validated preferences. Corrupt, oversized, incompatible and unavailable records return neutral failure instead of crashing. Observable message/cue/ownership/phone/scene/arithmetic-completion transitions commit before visible update or sound. Muted procedural WebAudio is opt-in and unlocked by the start/toggle gesture; no voice, analytics or external audio calls. Missing AudioContext gives one neutral notice. Visibility loss pauses the clock; resume has no catch-up jump. The short store camera emphasis in S03 is reversible optical zoom with inverse-transformed pointer coordinates.

## Engine freeze and verification

Engine source/build pairs are byte-identical. SHA-256 at this freeze:

| File | SHA-256 |
|---|---|
| `dist/model.js` and `src/build-engine-model.js` | `16dcbf5355b62a8029fdc5920bfb8e7948b8938280251c00ec5379cddd12623e` |
| `dist/engine.js` and `src/build-engine-runtime.js` | `e60ae1dd4d56764c173a76162f23fda571c670e1c8d6691ee8d78975bdf0f51f` |
| Active `dist/assets/manifest.json` (art-owned) | `c0d33b8b44d19f4f0c77ebf63d6c5b3013e702dd1755e5c1cf903a51a92023b7` |
| `nastya-work-v3.png` (art-owned) | `e38f515c76fe7084ceeb5033248bbc02cc1c4ccfc1bb0a62e2c152391b017439` |

Engine-owned targeted checks passed: Node syntax; 19 exact authored frame boundaries and 57 native rendered frames at those boundaries ±1/60; fixed chair state at all 11,341 timeline samples; phone only after the pupils exit; 169 raised-arm pen-up samples using all four new inter-glyph frames. Actual renderer counterfactual differences show 198 visible notebook pixels at 71 and 5 correction pixels at 78. These are targeted implementation checks and same-model visual inspection, not independent artistic sign-off.

Verification status is owned by QA and the separate critic. Earlier pre-V2 and V2 regression results are historical and must not be presented as proof of this v3 integration. Final full regression and independent native frame review are pending at this freeze and will be recorded by their owners against these hashes. Real browser, mobile browser, tab/audio behavior and FPS remain `NOT_CHECKED` until supported managed browser execution is available. Native Canvas capture is not a browser screenshot. Existing Nastya ordinary walking and chalk-step leg ambiguity, and Vova's incomplete pocket-specific phone action, remain explicit art limitations for independent critique.

## Remaining open P1: complete chalk action

The independent critic's newer raw-boundary inspection found an unresolved chalk entry at 34.983333 → 35 seconds: walking frame 10 hand `[199.4,161]` changes to raised frame 12 hand `[197,115]`, about 46.06 native pixels in one frame. At 46.483333 → 46.5, frame 14 hand `[279,131]` changes to empty idle frame 0 hand `[293,166]`, about 37.70 pixels, while the held chalk disappears. Raised pen-up repair does not close this full action.

One bounded inventory assessment found no honest code-only repair using the existing whole-body artwork. The proposed `point5` is already raised, with hand offset `[-32,-77]`; at floor y197 its hand is at y120. Idle frame 0 is at y166, so inserting point5 would move a 50.57-pixel hand jump to an earlier boundary. `boardReach3` is also raised at y121. Frame 15 reaches y136 but still has chalk baked into the raised hand. Frame 6 reaches y153 by leaning toward a notebook; it is not an upright chalk raise, ledge pickup or release. A chain through these frames would substitute the wrong action or move the same missing transition.

The critic agreed with this assessment. No engine or asset code was changed for this additional entry/return review; the engine SHA-256 freeze above remains current. This P1 stays **OPEN** and prevents a completed-action claim. A future art repair needs upright intermediate raise/lower poses, a real chalk ledge or pocket contact, and an empty-hand pose after release. Drawing still starts at 35, completes at 46.5, and preserves the exact `7 + 5 = 12`.
