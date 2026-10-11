# Nastya v3 action asset handoff

Status: mechanically exported and integrated into the asset manifest; live-engine motion critique and artistic approval remain pending.

Rebuild from the retained source artwork with `python src/build-assets.py`. The standard builder runs `build-assets-nastya-phone.py`, then `build-assets-nastya-v3.py`; it finishes on v3 instead of reverting the active manifest to v2. No new image generation is performed.

Atlas: `dist/assets/actors/nastya-work-v3.png`; 768×448; 96×112 cells; columns8, rows4, frameCount28; pivot[48,100]. The final four cells are transparent and have no pose metadata. Alpha is binary0/255.

Indices0–15 and the ordinary walk aliases remain unchanged as RGBA pixels. Phone source frames0–7 are exact copies at indices16–23. Chalk source frames0–3 are exported at24–27 at one scale80/656.

| Index | Pose | Hand offset | Baked item |
|---:|---|---|---|
| 16 | sitSettle | [1, -24] | none |
| 17 | pocketContact | [15, -30] | none |
| 18 | phoneLow | [2, -30] | none |
| 19 | phoneHold | [2, -38] | none |
| 20 | phoneType | [3, -39] | none |
| 21 | pocketReturn | [15, -31] | none |
| 22 | halfRise | [-3, -29] | none |
| 23 | standNeutral | [-11, -31] | none |
| 24 | chalkStep0 | [-16, -73] | chalk |
| 25 | chalkStep1 | [-15, -73] | chalk |
| 26 | chalkStep2 | [-15, -74] | chalk |
| 27 | chalkStep3 | [-14, -73] | chalk |

Chalk tip offsets for24–27: [-20,-75],[-19,-75],[-18,-76],[-18,-75]. These are distinct from the grip sockets. Each frame already contains a short chalk: do not render another prop. All four are middle-height raised poses; use them only for inter-glyph movement. Stationary pen-up can retain the previous authored chalk-height pose.

Phone sequences: sitDown[23,22,16]; pocketTake[17,18,19]; phoneHold[19]; phoneType[19,20,19]; pocketPut[19,18,21]; standUp[21,22,23]. Pocket contact17/21 is the visibility boundary for a separate phone prop. No phone is baked in16–23.

The phone action contract records the engine chair proposal (29×40, left235, top202, floor242) and suggested seated hip offset[19,-24]. Actual hip contact and phone ownership still require the live-engine review.

Known motion limitation: the new raised chalk steps have ambiguous opposite-leading legs; they are not an accepted opposite gait. The ordinary Nastya walk had previous failed repair attempts and has not been changed or certified here.

Mechanical evidence: frame alpha/padding/socket/pose range checks passed, first16 RGBA pixels matchv2, phone8 RGBA pixels match the standalone phoneexport. A standard rebuild retained all45 checked non-Nastya/v2 PNG hashes and ended with28 frames plus4 transparent sparecells.

Review files: `production/art-review/nastya-all28-native-x2-v3.png`, `nastya-appended12-native-x3-v3.png`, and `nastya-chalk-step-sockets-native-x4-v1.png`. They include every authored Nastya sprite, not a selected showcase.

Exact asset hashes are in `production/art-export-v3.json`. Core hashes:

| File | SHA-256 |
|---|---|
| dist/assets/actors/nastya-work-v3.png | e38f515c76fe7084ceeb5033248bbc02cc1c4ccfc1bb0a62e2c152391b017439 |
| dist/assets/manifest.json | c0d33b8b44d19f4f0c77ebf63d6c5b3013e702dd1755e5c1cf903a51a92023b7 |
| production/art-contract-v3.json | c0d33b8b44d19f4f0c77ebf63d6c5b3013e702dd1755e5c1cf903a51a92023b7 |
| production/art-source/nastya-chalk-step-source-v1.png | c93c15b81a0ea2d7a3a53e101c32a6a19c90a1d8478f99031ceeb710ec7d38a8 |
| production/nastya-chalk-step-action-v1.json | c3ccb3fd9bc791b121432e40809adfc276abd803630c34a37953b26ed518d966 |
