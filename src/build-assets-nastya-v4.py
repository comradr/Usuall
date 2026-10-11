"""Reconstruct the v4 export from the preserved original source sheet.

No artwork generation, per-pose rescaling, or engine edits. The previous export
was lost during workspace maintenance; this re-export is not byte-equivalence
evidence for those lost files. Native art/motion acceptance requires the critic.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'production/art-source/nastya-motion-source-v4.png'
ACTORS = ROOT / 'dist/assets/actors'
REVIEW = ROOT / 'production/art-review/nastya-motion-v4'
CONTRACT = ROOT / 'production/nastya-motion-v4.json'
for directory in (ACTORS, REVIEW):
    directory.mkdir(parents=True, exist_ok=True)

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def binary_rgba(image):
    image = image.convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda value: 255 if value >= 160 else 0))
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return image

raw_source = Image.open(SOURCE).convert('RGBA')
assert raw_source.size == (1536, 1024)
assert sha256(SOURCE) == '743740ec3745860cea6cd3328ab95817824365e0796eec2626728f33723638a1'
source = binary_rgba(raw_source)
# Source body measurements, excluding an arm extending above the head.
# All four cells in a row use one scale; the crop box only discards empty space.
row_bounds = [(0, 350), (350, 670), (670, 1024)]
row_body_heights = [332, 304, 324]
floor = [(218, 344), (588, 344), (946, 344), (1348, 344),
         (219, 664), (597, 664), (964, 664), (1336, 664),
         (225, 1003), (611, 1003), (980, 1003), (1355, 1003)]
accepted_raw = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11]
names = ['walkContactNear', 'walkPassingNear', 'walkContactFar', 'walkPassingFar',
         'chalkRestEmpty', 'chalkReachLowEmpty', 'chalkChestHeld', 'chalkFaceHeld',
         'chalkHighHeld', 'chalkContactLowHeld', 'chalkContactLowEmpty']
hands = [[30, 66], [31, 66], [39, 57], [24, 60], [35, 71], [20, 66],
         [25, 41], [27, 34], [28, 23], [22, 63], [24, 63]]
tips = [None] * 6 + [[22, 37], [24, 31], [24, 20], [20, 64], None]
atlas = Image.new('RGBA', (768, 224))
frames, records, sockets, issues = [], [], {}, []
for index, raw_index in enumerate(accepted_raw):
    row, column = divmod(raw_index, 4)
    y0, y1 = row_bounds[row]
    x0 = column * 384
    cell = source.crop((x0, y0, x0 + 384, y1))
    box = cell.getchannel('A').getbbox()
    scale = 80 / row_body_heights[row]
    cut = cell.crop(box)
    cut = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.Resampling.NEAREST)
    fx, fy = floor[raw_index]
    origin = [round(48 - (fx - x0 - box[0]) * scale),
              round(100 - (fy - y0 - box[1]) * scale)]
    frame = Image.new('RGBA', (96, 112))
    frame.alpha_composite(cut, tuple(origin))
    frame = binary_rgba(frame)
    atlas.paste(frame, ((index % 8) * 96, (index // 8) * 112))
    frame.save(ACTORS / f'nastya-motion-v4__{index:02d}__{names[index]}.png')
    frames.append(frame)
    socket = {'hand': hands[index], 'handOffset': [hands[index][0] - 48, hands[index][1] - 100],
              'socketKind': 'authored-hand-grip', 'heightGroup': 'middle'}
    if tips[index]:
        socket.update({'chalkTip': tips[index],
                       'chalkTipOffset': [tips[index][0] - 48, tips[index][1] - 100],
                       'bakedItem': 'chalk'})
    sockets[str(index)] = socket
    for kind, point in [('hand', hands[index]), ('chalkTip', tips[index])]:
        if point and not any(frame.getpixel((x, y))[3] for y in range(max(0, point[1] - 2), min(112, point[1] + 3))
                             for x in range(max(0, point[0] - 2), min(96, point[0] + 3))):
            issues.append({'index': index, 'issue': kind + ' is more than 2px from opaque pixels'})
    bounds = list(frame.getchannel('A').getbbox())
    if bounds[0] < 2 or bounds[1] < 2 or bounds[2] > 94 or bounds[3] > 110:
        issues.append({'index': index, 'issue': 'unsafe frame padding', 'bounds': bounds})
    # Legacy frames retain their original names when this atlas is appended.
    # Metadata names therefore need a version suffix; PNG paths stay stable.
    records.append({'index': index, 'name': names[index] + 'V4', 'source': 'nastyaMotionV4',
                    'rawSourceIndex': raw_index, 'sourceCell': [x0, y0, 384, y1 - y0],
                    'sourceOpaqueBoundsInCell': list(box), 'sourceFloorPivot': [fx, fy],
                    'sourceFloorMeaning': 'measured ground projection; individual pivot, common row scale',
                    'bodyHeightSourcePx': row_body_heights[row], 'bodyHeightNativePx': 80,
                    'scale': scale, 'nativeOrigin': origin, 'pivot': [48, 100], 'bounds': bounds,
                    **socket})
atlas_path = ACTORS / 'nastya-motion-v4.png'
atlas.save(atlas_path)

# These preserve the unfiltered source and rejected artwork, including low-alpha
# background pixels; review evidence never silently discards a rejected pose.
shutil.copy2(SOURCE, REVIEW / 'all-12-source-unfiltered.png')
raw_source.crop((768, 350, 1152, 670)).save(REVIEW / 'rejected-raw-6-unfiltered.png')

def sheet(marked):
    columns, scale = 4, 3
    width, height = 96 * scale, 132 * scale
    result = Image.new('RGB', (columns * width, 3 * height), '#d8c7ad')
    draw = ImageDraw.Draw(result)
    for index, frame in enumerate(frames):
        x, y = (index % columns) * width, (index // columns) * height
        large = frame.resize((96 * scale, 112 * scale), Image.Resampling.NEAREST)
        result.paste(large, (x, y), large)
        draw.text((x + 4, y + 112 * scale + 4), f'{index} raw {accepted_raw[index]} {names[index]}', fill='#263235')
        draw.text((x + 4, y + 112 * scale + 18), f'grip {hands[index]} pivot [48,100]', fill='#263235')
        if marked:
            for point, color in [(hands[index], '#00a092'), (tips[index], '#df3573'), ([48, 100], '#3876d6')]:
                if point:
                    px, py = x + point[0] * scale, y + point[1] * scale
                    draw.ellipse((px - 3, py - 3, px + 3, py + 3), outline=color, width=2)
    return result
sheet(False).save(REVIEW / 'valid-11-native-x3.png')
sheet(True).save(REVIEW / 'valid-11-native-x3-sockets.png')
alpha_values = sorted(set(atlas.getchannel('A').getdata()))
unique_frames = len({hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames})
assert alpha_values == [0, 255]
assert unique_frames == 11
assert not issues, issues
contract = {
    'version': 'nastya-motion-v4-reconstructed-export',
    'status': 'mechanically exported; independent art and runtime critique pending',
    'actor': 'nastya', 'image': 'assets/actors/nastya-motion-v4.png',
    'frameWidth': 96, 'frameHeight': 112, 'columns': 8, 'rows': 2, 'frameCount': 11,
    'pivot': [48, 100], 'frames': records, 'sockets': sockets,
    'poses': {'walk': [0, 1, 2, 3], 'chalkRaise': [4, 9, 6, 7, 8],
              'chalkLower': [6, 9, 4], 'chalkRest': [4]},
    'acceptedRawIndices': accepted_raw,
    'rejected': [{'rawSourceIndex': 6, 'reason': 'wrong active arm; no visible chalk',
                  'evidence': 'production/art-review/nastya-motion-v4/rejected-raw-6-unfiltered.png'}],
    'ownership': 'Only local6–9 contain a baked chalk; draw a separate prop for other held-chalk frames.',
    'motionLimitations': [
        'Legacy raised-chalk walk24–27 untouched, known opposite-support gait defect remains P1.',
        'Contact0/2 show similar trouser silhouettes; opposite supporting leg remains visually ambiguous.',
        'Native source export and opaque socket proximity do not establish art or in-game motion acceptance.',
    ],
    'provenance': {'method': 'deterministic re-export from preserved built-in image source; no generation',
                   'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': sha256(SOURCE),
                   'sourceDimensions': list(raw_source.size), 'alphaThreshold': 160,
                   'scaling': 'nearest-neighbor; one80px body scale per measured source row',
                   'recovery': 'Original v4 export was removed by workspace maintenance; lost export byte identity cannot be verified.'},
    'mechanicalQA': {'issues': issues, 'alphaValues': alpha_values, 'uniqueFrames': unique_frames,
                     'raw6Excluded': True, 'atlasSize': list(atlas.size),
                     'sourcePreserved': sha256(SOURCE) == sha256(REVIEW / 'all-12-source-unfiltered.png')},
    'hashes': {str(path.relative_to(ROOT)): sha256(path) for path in [SOURCE, atlas_path, *sorted(REVIEW.glob('*.png'))]},
}
CONTRACT.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'image': contract['image'], 'frameCount': 11, 'mechanicalQA': contract['mechanicalQA']}, ensure_ascii=False))
