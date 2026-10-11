# Independent critic baseline — S02–S03

This is the source-derived acceptance plan, not a verdict on an executable build. It was prepared before the current-artifact handoff. Reviewer: separate delegated `/root/critic`; production code and assets are read-only.

## Source precedence

The approved concept v3 passport, S02/S03 scene scripts, art bible, reference critique, acceptance matrix, state contracts and animation/UI/camera bibles govern the slice. Reference PNG #12 governs distinguishing character shapes; #14 guides environment construction. Their baked text, UI, dates and inconsistent poses are explicitly rejected.

## Acceptance criteria

| Domain | Required observable result |
|---|---|
| Art | Intentional pixel clusters, coherent 3/4 camera, differentiated store/class lighting; ordinary functional environments rather than a static illustrated poster. |
| Characters | Vova: tousled dark hair, rectangular black glasses, one consistent work costume. Nastya: long dark-blond hair, rounded glasses, light blouse and dark-brown vest/trousers. Adult silhouette and identities remain legible at native/mobile game size. |
| Animation | Every authored pose and runtime transition is valid when frozen; feet support body; shoulders/elbows/hands remain joined; world/hand pivots align; objects have exactly one owner. Check before/at/after each ownership change and reverse/return. |
| Environment | Clean backgrounds separate from actors, hand items, chalk, movable bread, foreground occlusion and UI. Fixed shop/class topology; teacher follows a path around furniture. Generic pupils remain anonymous. |
| Narrative | S02 visibly demonstrates two independent jobs: bread grab/pack/cart plus chalk writing, raised hand and desk help. S03: cart-to-shelf transfer, school break, phone pickup, exact five-message exchange, return to work. No phone during teaching or while Vova handles bread. |
| Gameplay | Action taps may accelerate/explore; no-input progression reaches slice exit. Skip, pause, reset, repeat action and focus changes preserve a consistent world. No relationship meters, fictional speech choices or permanent softlock. |
| UI | Russian text remains selectable/readable; 44px controls, keyboard navigation, visible focus, reduced-motion and safe areas. Desktop split; portrait main world plus switchable PIP that covers no critical hand/item. One readable chat, no baked UI. |
| Web | Actual browser pointer/touch/keyboard, JS execution, loaded assets, transitions and tab resume require real evidence. Offscreen draw capture is only rendering evidence. |
| Audio | Opt-in/mute and intended fridge/rustle/chalk/bell/notification cue timing; no invented voices or emotional pressure. Browser playback and mix require real evidence. |
| Performance | Device/browser FPS, pacing, loading and memory require measurements. File sizes or headless draw success cannot establish mobile performance. |
| Persistence | Save/reload/reset and corruption recovery preserve scene, message IDs, focus, chalk and one bread location; no duplicate notification. Code/model checks may support a bounded verdict, browser storage remains separate. |
| Integration | Both halves continue independently; narration, ownership, poses, UI and cues agree at contacts and scene boundaries. S02 exit keeps chalk and packed bread; S03 exit has shelf +1, cart −1 and five true messages. |

## Highest-risk boundaries and adversarial probes

1. Crate→hands→package→cart→hands→shelf: freeze t−1/t/t+1; inspect source item disappearance and exactly one destination render; save/skip each boundary.
2. Chalk pickup/contact/reveal/return: board stays blank before contact, reveals `7 + 5 = 12` with the writing hand and retains it afterward.
3. Raised hand→teacher turn→desk route→notebook contact: no pass-through of desk or floating pointing hand; children show distinct independent activity.
4. Lesson→bell/pupil exit→seated phone→message: Nastya cannot send while teaching. Vova phone begins only after shelf release/free hands.
5. Message IDs `4459710`, `4459712`, `4459713`, `4459715`, `4459716`: exact lowercase/case/spaces and correct speaker; no invented quote inserted between them.
6. Focus/PIP/resize/pause/reduced motion/low FPS: state and contacts do not reset; native-size silhouettes stay readable; important objects remain visible.
7. Scene commit/reload/reset: no duplicated bread, chalk, chat or cue; corrupt/outdated save fails safely.

## Evidence limits

Live browser, DOM/mobile touch, audible playback, tab performance and browser persistence remain `NOT_CHECKED` unless actual current-build evidence arrives. No preview browser will be launched or installed by this reviewer. Source PNGs, deterministic model outputs, tests and offscreen captures can support narrower conclusions. No full-game or 100% claim is possible for this slice.
