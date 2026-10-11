"""Append existing Nastya phone and raised-chalk art to the preserved v2 atlas.

This is a deterministic crop/export, not a sprite generator or an art approval.
The first sixteen cells remain byte-for-byte equal as RGBA pixels to v2.
"""
from copy import deepcopy
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'
ACTORS = ASSETS / 'actors'
PROD = ROOT / 'production'
SOURCE = PROD / 'art-source/nastya-chalk-step-source-v1.png'
GENERATED = Path('/workspace/scratch/c320be6a75fa/generated_images/exec-c6bc9bc9-1613-47b3-a342-cb7d353a3333.png')
REVIEW = PROD / 'art-review'
for folder in [SOURCE.parent, ACTORS, REVIEW]:
    folder.mkdir(parents=True, exist_ok=True)
if not SOURCE.exists():
    shutil.copy2(GENERATED, SOURCE)

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def binary_rgba(image):
    image = image.convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if not pixels[x, y][3]:
                pixels[x, y] = (0, 0, 0, 0)
    return image

def near_opaque(frame, point, radius=2):
    return any(frame.getpixel((x, y))[3]
               for x in range(max(0, point[0] - radius), min(96, point[0] + radius + 1))
               for y in range(max(0, point[1] - radius), min(112, point[1] + radius + 1)))

# Use the source's actual 543px column width, not the older 384px sheets.
# The source floor pivot is the ground projection of the pelvis. The supporting
# sole is separately recorded; neither the cutout bbox nor a raised hand sets scale.
image = binary_rgba(Image.open(SOURCE))
assert image.size == (2172, 724), image.size
scale = 80 / 656
feet = [(330, 687), (821, 685), (1318, 688), (1813, 695)]
supporting_soles = [(267, 687), (800, 685), (1255, 688), (1759, 695)]
grips = [(198, 87), (699, 87), (1199, 78), (1699, 98)]
tips = [(168, 70), (669, 70), (1167, 61), (1668, 81)]
chalk_frames, chalk_info, chalk_sockets, issues = [], [], {}, []
chalk_atlas = Image.new('RGBA', (384, 112), (0, 0, 0, 0))
for i in range(4):
    cx = i * 543
    tile = image.crop((cx, 0, cx + 543, 724))
    bbox = tile.getchannel('A').getbbox()
    cut = tile.crop(bbox)
    cut = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.Resampling.NEAREST)
    fx, fy = feet[i]
    ox = round(48 - (fx - cx - bbox[0]) * scale)
    oy = round(100 - (fy - bbox[1]) * scale)
    frame = Image.new('RGBA', (96, 112), (0, 0, 0, 0))
    frame.alpha_composite(cut, (ox, oy))
    frame = binary_rgba(frame)
    hand = [round(48 + (grips[i][0] - fx) * scale), round(100 + (grips[i][1] - fy) * scale)]
    tip = [round(48 + (tips[i][0] - fx) * scale), round(100 + (tips[i][1] - fy) * scale)]
    offset = [hand[0] - 48, hand[1] - 100]
    tip_offset = [tip[0] - 48, tip[1] - 100]
    bounds = list(frame.getchannel('A').getbbox())
    for kind, point in [('hand grip', hand), ('chalk tip', tip)]:
        if not near_opaque(frame, point):
            issues.append({'index': i + 24, 'issue': kind + ' more than 2px from exported opaque pixels'})
    if bounds[0] < 2 or bounds[1] < 2 or bounds[2] > 94 or bounds[3] > 110:
        issues.append({'index': i + 24, 'issue': 'unsafe frame padding', 'bounds': bounds})
    chalk_atlas.alpha_composite(frame, (i * 96, 0))
    frame.save(ACTORS / f'nastya__chalkStep{i}__f000.png')
    chalk_frames.append(frame)
    chalk_sockets[str(i)] = {
        'hand': hand, 'handOffset': offset, 'socketKind': 'raised-hand-grip',
        'chalkTip': tip, 'chalkTipOffset': tip_offset, 'bakedItem': 'chalk',
        'heightGroup': 'middle',
    }
    chalk_info.append({
        'index': i, 'name': f'chalkStep{i}', 'source': 'nastyaChalkStep',
        'sourceCell': [cx, 0, 543, 724], 'sourceFeet': list(feet[i]),
        'sourceFeetMeaning': 'ground projection of pelvis; lower visible sole baseline',
        'sourceSupportingSole': list(supporting_soles[i]),
        'sourceHand': list(grips[i]), 'sourceChalkTip': list(tips[i]),
        'scale': scale, 'bounds': bounds, 'hand': hand, 'handOffset': offset,
        'chalkTip': tip, 'chalkTipOffset': tip_offset,
        'motionPurpose': 'raised chalk hand continuity during inter-glyph pen-up movement',
        'gaitStatus': 'opposite leading leg ambiguous; not accepted as a verified opposite gait',
    })
chalk_atlas.save(ACTORS / 'nastya-chalk-step-action-v1.png')
chalk_contract = {
    'version': 'nastya-chalk-step-action-v1',
    'status': 'exported-proposed; in-engine continuity and independent art critique pending',
    'actor': 'nastya', 'image': 'assets/actors/nastya-chalk-step-action-v1.png',
    'frameWidth': 96, 'frameHeight': 112, 'columns': 4, 'rows': 1,
    'frameCount': 4, 'pivot': [48, 100],
    'poses': {'chalkStep': [0, 1, 2, 3], 'chalkPenUp': [0, 1, 2, 3]},
    'sockets': chalk_sockets, 'frames': chalk_info,
    'ownership': 'one short chalk is already baked in every frame; do not draw a second chalk prop',
    'notes': [
        'Four raised-arm source poses at one common body/head scale. No per-frame bounding-height normalization.',
        'Hand sockets identify the grip; chalkTipOffset identifies the visible baked chalk contact tip.',
        'All four raised hands are near the middle-height chalk pose. This sheet supplies no high or low drawing-height variants.',
        'Use only for movement between glyphs. A stationary pen-up may keep its previous authored chalk-height pose.',
        'The leg silhouette has an ambiguous opposite stride. It is not evidence that the ordinary walk was fixed.',
        'Native export and socket checks are mechanical evidence only; no art or motion acceptance is asserted.',
    ],
    'provenance': {
        'method': 'pre-existing built-in image_gen source; no new generation or limb synthesis',
        'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': sha256(SOURCE),
        'generatorFile': GENERATED.name, 'sourceDimensions': list(image.size),
        'export': 'alpha threshold 160; common scale 80/656; measured source grip/tip/floor landmarks; nearest-neighbor',
    },
    'mechanicalQA': {'issues': issues, 'alphaValues': sorted(set(chalk_atlas.getchannel('A').get_flattened_data()))},
}
write_json(PROD / 'nastya-chalk-step-action-v1.json', chalk_contract)

manifest_path = ASSETS / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
base_actor = json.loads((PROD / 'art-contract-v2.json').read_text())['actors']['nastya']
phone = json.loads((PROD / 'nastya-phone-action-v1.json').read_text())
base_atlas = Image.open(ACTORS / 'nastya-work-v2.png').convert('RGBA')
phone_atlas = Image.open(ACTORS / 'nastya-phone-action-v1.png').convert('RGBA')
assert base_atlas.size == (768, 224)
assert phone_atlas.size == (768, 112)
atlas = Image.new('RGBA', (768, 448), (0, 0, 0, 0))
atlas.paste(base_atlas, (0, 0))
atlas.paste(phone_atlas, (0, 224))
atlas.paste(chalk_atlas, (0, 336))
assert atlas.crop((0, 0, 768, 224)).tobytes() == base_atlas.tobytes()
assert atlas.crop((0, 224, 768, 336)).tobytes() == phone_atlas.tobytes()
atlas.save(ACTORS / 'nastya-work-v3.png')
actor = deepcopy(base_actor)
actor.update({
    'image': 'assets/actors/nastya-work-v3.png', 'rows': 4, 'frameCount': 28,
    'status': 'prototype-exported-v3; action craft, gait, and live motion acceptance pending',
})
for record in phone['frames']:
    new = deepcopy(record)
    new['index'] += 16
    new['source'] = 'nastyaPhoneAction'
    actor['frames'].append(new)
for index, socket in phone['sockets'].items():
    actor['sockets'][str(int(index) + 16)] = deepcopy(socket)
for record in chalk_info:
    new = deepcopy(record)
    new['index'] += 24
    actor['frames'].append(new)
for index, socket in chalk_sockets.items():
    actor['sockets'][str(int(index) + 24)] = deepcopy(socket)
for name, indices in phone['poses'].items():
    actor['poses'][name] = [index + 16 for index in indices]
for i, name in enumerate([frame['name'] for frame in phone['frames']]):
    # Keep the existing generic `phone` key; add specifically named action cells.
    actor['poses'].setdefault(name, [i + 16])
actor['poses'].update({
    'chalkStep': [24, 25, 26, 27], 'chalkPenUp': [24, 25, 26, 27],
    'chalkPenUpStep': [24, 25, 26, 27],
    **{f'chalkStep{i}': [i + 24] for i in range(4)},
})
actor['actionContracts'] = {
    'pocketPhone': 'production/nastya-phone-action-v1.json',
    'chalkPenUpStep': 'production/nastya-chalk-step-action-v1.json',
}
actor['motionLimitations'] = [
    'Ordinary walking frames 8–11 and aliases remain unchanged; previous opposite-leg repair was not verified.',
    'Chalk step frames 24–27 preserve raised arm continuity, with ambiguous opposite-leading leg.',
    'Phone action chair hip contact and separate phone ownership require live-engine review.',
]
manifest['actors']['nastya'] = actor
manifest['version'] = 'art-contract-v3-nastya-phone-and-pen-up'
manifest['status'] = 'prototype-exported; independent live motion review and user art approval pending'
write_json(manifest_path, manifest)
write_json(PROD / 'art-contract-v3.json', manifest)

def contact_sheet(indices, columns, scale_factor, filename, marked=False):
    rows = (len(indices) + columns - 1) // columns
    width, height = 96 * scale_factor, 136 * scale_factor
    result = Image.new('RGB', (columns * width, rows * height), '#d8c7ad')
    draw = ImageDraw.Draw(result)
    for cell, index in enumerate(indices):
        fx, fy = (index % 8) * 96, (index // 8) * 112
        frame = atlas.crop((fx, fy, fx + 96, fy + 112))
        rendered = frame.resize((96 * scale_factor, 112 * scale_factor), Image.Resampling.NEAREST)
        x, y = (cell % columns) * width, (cell // columns) * height
        result.paste(rendered, (x, y), rendered)
        draw.text((x + 4, y + 112 * scale_factor + 4), f'{index} {actor["frames"][index]["name"]}', fill='#263235')
        offset = actor['sockets'][str(index)]['handOffset']
        draw.text((x + 4, y + 112 * scale_factor + 18), f'grip {offset[0]},{offset[1]}', fill='#263235')
        if marked:
            for kind, color in [('hand', '#00b098'), ('chalkTip', '#df3573')]:
                point = actor['sockets'][str(index)].get(kind)
                if point:
                    px, py = x + point[0] * scale_factor, y + point[1] * scale_factor
                    draw.ellipse((px - 2, py - 2, px + 2, py + 2), outline=color)
    result.save(REVIEW / filename)

contact_sheet(list(range(28)), 8, 2, 'nastya-all28-native-x2-v3.png')
contact_sheet(list(range(16, 28)), 4, 3, 'nastya-appended12-native-x3-v3.png')
contact_sheet(list(range(24, 28)), 4, 4, 'nastya-chalk-step-sockets-native-x4-v1.png', marked=True)

for index, socket in actor['sockets'].items():
    i = int(index)
    assert 0 <= i < 28
    for name in ['hand', 'chalkTip']:
        if name in socket:
            assert 0 <= socket[name][0] < 96 and 0 <= socket[name][1] < 112
for name, indices in actor['poses'].items():
    assert all(0 <= i < 28 for i in indices), (name, indices)
alpha_values = sorted(set(atlas.getchannel('A').get_flattened_data()))
assert alpha_values == [0, 255], alpha_values
assert len(actor['frames']) == 28
assert not issues, issues
report = {
    'version': 'nastya-export-v3-mechanical-report',
    'status': 'mechanically exported; artistic approval explicitly pending',
    'nativeAtlasSize': list(atlas.size), 'frameCount': 28, 'pivot': [48, 100],
    'alphaValues': alpha_values, 'socketIssues': issues,
    'preservation': {
        'first16NastyaRGBAPixelsEqualV2': True,
        'phone8RGBAPixelsEqualPhoneV1': True,
        'ordinaryWalkIndices': [8, 9, 10, 11], 'ordinaryWalkRepaired': False,
        'vovaBackgroundsPropsOccluders': 'not edited by this script',
    },
    'limits': actor['motionLimitations'],
    'hashes': {
        str(path.relative_to(ROOT)): sha256(path)
        for path in [
            SOURCE, ACTORS / 'nastya-work-v2.png', ACTORS / 'nastya-phone-action-v1.png',
            ACTORS / 'nastya-chalk-step-action-v1.png', ACTORS / 'nastya-work-v3.png',
            PROD / 'nastya-phone-action-v1.json', PROD / 'nastya-chalk-step-action-v1.json',
            PROD / 'art-contract-v3.json', manifest_path,
            REVIEW / 'nastya-all28-native-x2-v3.png', REVIEW / 'nastya-appended12-native-x3-v3.png',
            REVIEW / 'nastya-chalk-step-sockets-native-x4-v1.png',
        ]
    },
}
write_json(PROD / 'art-export-v3.json', report)
print(json.dumps({'atlas': actor['image'], 'indices': {'phone': list(range(16, 24)), 'chalkPenUp': list(range(24, 28))}, 'chalkSockets': chalk_sockets, 'issues': issues}, ensure_ascii=False))
