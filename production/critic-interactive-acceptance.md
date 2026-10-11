# Independent acceptance — interactive landscape revision

Reviewer context: `/root/critic_final`. This delegated context writes review evidence only; it does not alter game production source or assets. Final verdicts will be tied to the newly frozen build manifest. The prior `production/quality-gate.json` certifies only its old build and remains unchanged.

The current user wants a viewport-filling game, horizontal split on phones, a lower-right phone when a character actually takes one, causal work/customer buttons, and improved anonymous pupils and shoppers. The current milestone remains the supplied S02/S03 fragment; no claim to finish all eleven scenes.

## Required cases

- Immersive presentation: no article heading/footer/cards, external chat panel or picture-in-picture. Equal side-by-side native worlds, bounded aspect ratio without stretching or cropped important objects. Portrait offers rotation and does not silently advance the story. Fullscreen starts from a user gesture with honest rejected/unsupported API handling. Browser chrome behavior requires actual supported browser evidence.
- Phone: lower-right in-game overlay follows actual model phone visibility, remains absent while pocketed, and contains only the five exact source messages in their canonical order. Message text uses safe text assignment; replying cannot create unrestricted or invented dialogue.
- Input: six distinct action gates have one meaningful available button at a quiet boundary; waiting never crosses the gate automatically. Accepting an action starts its physical sequence and never teleports the story. Wrong/future/stale/duplicate actions are rejected. Busy work and incoming shopper coexist. A waiting gate may stop the shared story clock but must not freeze a shopper mid-exit or a half-finished gesture.
- Customer: arrival/wait are distinct from servicing; service requires input and an approach/grab/scan/release/collection sequence. A separate neutral purchase packet cannot consume or duplicate the tracked six-loaf batch. Shopper hand/payload contact and floor depth must be credible in actual rendered frames. Shopper completes exit before the next waiting gate.
- Save: accepted-action ledger is committed before observable state, waiting/performing action restores consistently, restart clears it, corrupt/old/blocked storage has an explicit safe policy, and a completed gate never reopens. UI pause/menu/portrait/visibility reasons cannot unexpectedly resume manually paused gameplay.
- Characters: all authored NPC frames fit native camera/scale/palette and use connected limbs. Raised pupil hand remains visible above the head after furniture occlusion. Anonymous pupils stay anonymous. Previous Nastya lead-leg gait and chalk entry/return P1 remain open unless actual new source/render repairs are demonstrated; frame count/hash differences are not repairs.
- Canon/integration: board remains 7 + 5 = 12, one loaf owner, physical phone ownership, no phone during lesson, exact five messages, both worlds share a coherent chronology, and full input traversal can finish without a permanent softlock.

## Evidence policy

Review every one of the fourteen domains: visual, characters, animation, environment_vfx, narrative, gameplay, ui, web, audio, performance, persistence, accessibility, privacy, integration. Native Canvas is native Canvas; source/DOM shims are not browser screenshots. Absent supported browser capability means actual mobile layout/input/audio/FPS/accessibility/browser-storage checks remain NOT_CHECKED. A separate delegated review and deterministic regression results do not establish user creative approval.

Any P0/P1 remains a BLOCKED milestone and must be reported directly. Lower-severity findings identify a concrete symptom, owner, fix and repeatable retest. Do not overwrite the original signed baseline or declare overall completion from partial native tests.
