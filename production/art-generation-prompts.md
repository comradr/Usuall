# Запросы ImageGen и происхождение изображений

Все девять исходных изображений изготовлены встроенным `image_gen`, без CLI/API ключа. Ниже сохранён читаемый набор производственных спецификаций запросов; это нормализованные briefs, не обещание дословной копии служебных payload. Исходные PNG, размеры, SHA-256 и пути зарегистрированы в `art-provenance.json`.

## Store · original opaque room

Reference14 supplies style and room staging only. Generate one complete grocery interior, no four-panel poster. 4:3 room, 480×360 native game pixels, modest 3/4 overhead camera, crisp contemporary cozy indie clusters. Warm ordinary cream daylight, wood bread shelf left, rear storage door, fridge and grocery shelves rear/right, cash counter right, empty packing bench, tiled clear central passage. No people, no player bread/phone/bags, no UI, text, logos, rain or fog. Furniture and architecture only. The generated room's real geometry must be measured rather than assumed from the prompt's approximate coordinates.

## School · original opaque room

Reference14 supplies style only. Generate one elementary classroom, 4:3 480×360 native game scene, modest coherent 3/4 overhead camera. Left daylight window, bookcase, blank green chalkboard rear, teacher desk at left of board, four pupil desks at lower left/right and an open central aisle. Cream walls, ordinary used oak desks, muted daylight. No teacher, children, names, writing, Pythagoras, notebook stacks, phones, schoolbags, UI or logos. Board surface blank; the example is rendered later by engine.

## Vova · first eight transparent poses

Reference12 left male supplies likeness/costume, not a poster to copy. Exactly eight isolated complete adult world sprites in equal 4×2 cells, transparent background, same native 80px standing scale and head size. Short tousled dark-brown hair, rectangular black glasses, charcoal polo and apron, straight charcoal trousers, low shoes. 3/4 left-facing. Pose order: idle, walkA, walkB, left-up reach, left-up grasp contact, empty cupped-hands carry, two-handed working forward lean, chest phone gesture. No table/bread/UI/labels. Natural attached elbows, shoulders, feet and weight; no stretched plank arms. First generated walkA/B were later judged insufficient as a complete gait; high reaching poses are reserved for shelf level.

## Nastya · first eight transparent poses

Reference12 right female supplies likeness/costume. Exactly eight isolated full-body transparent sprites in equal 4×2 cells, adult natural proportions and 80px native standing scale. Long straight ashy-brown hair, round dark glasses, white blouse, brown vest/wide trousers, low shoes. 3/4 left-facing. Poses: idle, walkA, walkB, board reach, chalk-writing, point, forward lean toward pupil exercise, seated break-phone hands. No desks, chair, board, people, notebook or UI baked into sprites. Hands at natural joints; no detached arm pieces. The generated tiny chalk/phone exceptions are recorded as baked items where present, to prevent duplicate rendering.

## Props · eight separated transparent items

Reference13 is prop-design reference only; no copied interface, English words or names. Eight objects in 4×2 transparent layout: one golden oblong loaf; empty clear bread bag; same single loaf in closed clear bag with blank label; empty wooden wheeled work trolley; plain black phone with unlit screen; closed muted-blue notebook with blank label; white chalk stick; simple wood/metal classroom chair. Crisp low-resolution 3/4-overhead pixel craft; no hands, characters, decorative objects or labels. Export each isolated object independently and measure its crop.

## Vova acting · eight additional physical poses

The first Vova source locks identity, wardrobe and pixel craft. Eight full-body transparent poses, identical head scale and left camera. Top row: forward working lean; half-straightened pickup; upright empty cupped carry; chest-height shelf intermediary with bent elbow. Lower row: half-knee bend; deep crouch with hands near ankles; half-standing from crouch; mostly straightened with slight knee bend. No loaf or trolley baked in. Crouching changes actual knee/back geometry and lowers the body; do not enlarge crouched figures to standing height. Keep natural weight and continuous attached limbs.

## Walking · initial attempt, rejected

Both referenced heroes, 4 poses per character in two rows. Intended sequence: near-leg contact, near-leg support/passing of far leg, opposite contact with far leg leading, far-leg support/passing of near leg. Always same left-facing face/identity; natural counter-swing arms, fixed costume. The source repeated the leading physical leg and support phase. Retained as rejected source, excluded from active atlas.

## Walking · targeted repair

Edit the first walking sheet, preserve identities, clothes, heads, camera, transparency and columns1/2. Change leg articulation and counter-swing in columns3/4. Column3: near visible leg goes down/right to trailing shoe while far leg extends down/left to leading shoe. Column4: far leg supports under hips, near leg bends forward/left with lifted foot, opposite the earlier passing phase. Continuous knees and occlusion at crossed trousers; never mirror the entire character or face. The male passing phase improved. Nastya's physical opposite phase remains ambiguous after two attempts; this is recorded rather than declared artistically accepted.

## Chalk heights + carry walking · last eight source poses

Nastya reference locks teacher identity/costume; corrected male walk sheet locks worker identity and leg phases. Top row: four chalk poses with unchanged feet/hips/body, only articulated writing arm changes. Hand/chalk at above-hair, forehead, eye and nose levels, four visibly distinct heights; no vertical body glide. Bottom row: four Vova walking phases copied as physical gait but both empty cupped hands stay at waist as though supporting a separate loaf. No loaf baked in, no furniture or UI. Real exported chalk-tip coordinates are used, not the intended approximate native offsets.

## Export constraints

Generation outputs are original source art, not automatically accepted atlases. Inspect equal cells, crop each figure, normalize feet [48,100] into native 96×112 frames, preserve standing head scale for crouches, measure actual hand/chalk-tip points. Binary alpha and zero RGB outside sprites; no matte halo. All 40 exported poses remain visible in the unfiltered contact sheet. Mechanical checks and artistic/runtime approval are separate.
