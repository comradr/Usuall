"""Contact/pose sheets and GIF derived only from recorded engine-render PNGs.

This is an image export from the game's actual native Canvas renderer, not a
browser recording or a claim about CSS/mobile layout/audio.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

out = Path(sys.argv[1]).resolve()
root = out.parents[1]
index = json.loads((out / 'index.json').read_text())
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(font_path, 16)
small = ImageFont.truetype(font_path, 12)

def open_frame(entry):
    return Image.open(root / entry['file']).convert('RGB')

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def contact_sheets():
    sheets = []
    for page, start in enumerate(range(0, len(index['contactCases']), 4), 1):
        items = index['contactCases'][start:start + 4]
        sheet = Image.new('RGB', (1000, 1080), '#f5f2e8')
        d = ImageDraw.Draw(sheet)
        d.text((18, 12), 'OFFSCREEN ENGINE · contacts ±1/60 s · not a browser capture', fill='#282c29', font=font)
        for row, case in enumerate(items):
            top = 48 + row * 250
            d.text((18, top), f"{case['id']} · {case['side']} · story t={case['time']:.5f}s", fill='#282c29', font=font)
            x, y, w, h = case['crop']
            scale = min(310 / w, 200 / h)
            size = (max(1, round(w * scale)), max(1, round(h * scale)))
            for col, frame in enumerate(case['frames']):
                image = open_frame(frame)
                offset = 480 if case['side'] == 'school' else 0
                crop = image.crop((x + offset, y, x + w + offset, y + h))
                crop = crop.resize(size, Image.Resampling.NEAREST)
                left = 18 + col * 326
                sheet.paste(crop, (left, top + 25))
                d.text((left, top + 228), f"t={frame['storyTime']:.8f}s", fill='#282c29', font=small)
        filename = out / f'contact-strip-{page:02d}.png'
        sheet.save(filename)
        sheets.append({'file': str(filename.relative_to(root)), 'sha256': digest(filename), 'contactCases': [v['id'] for v in items]})
    return sheets

def pose_sheets():
    sheets = []
    for actor in ['vova', 'nastya']:
        poses = [p for p in index['stagedPoses'] if p['actor'] == actor]
        for page, start in enumerate(range(0, len(poses), 12), 1):
            batch = poses[start:start + 12]
            rows = (len(batch) + 3) // 4
            sheet = Image.new('RGB', (1000, 64 + rows * 278), '#f5f2e8')
            d = ImageDraw.Draw(sheet)
            d.text((18, 12), f'OFFSCREEN ENGINE · {actor} · forced authored frames · pose audit only', fill='#282c29', font=font)
            for i, pose in enumerate(batch):
                x, y, w, h = pose['crop']
                offset = 480 if pose['side'] == 'school' else 0
                crop = open_frame(pose).crop((x + offset, y, x + w + offset, y + h)).resize((w * 2, h * 2), Image.Resampling.NEAREST)
                left = (i % 4) * 250
                top = 50 + (i // 4) * 278
                sheet.paste(crop, (left, top))
                d.text((left + 6, top + 235), f"frame {pose['frame']} · {pose['name']}", fill='#282c29', font=small)
            filename = out / f'all-poses-{actor}-{page:02d}.png'
            sheet.save(filename)
            sheets.append({'file': str(filename.relative_to(root)), 'sha256': digest(filename), 'actor': actor, 'poseFrames': [p['frame'] for p in batch]})
    return sheets

def export_gif(entries, filename, evidence_type):
    frames = [open_frame(f) for f in entries]
    # A stable shared palette prevents independent per-frame palette flicker.
    palette_sample = Image.new('RGB', (960, 360 * 7))
    for row, fraction in enumerate([0, .12, .25, .42, .6, .8, 1]):
        palette_sample.paste(frames[round((len(frames) - 1) * fraction)], (0, row * 360))
    palette = palette_sample.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    base_palette = palette.getpalette()
    # Pillow keeps 256 slots even after a 255-color quantization. Avoid an
    # unintended extra black color in its unused last slot.
    base_palette[255 * 3:256 * 3] = base_palette[:3]
    palette.putpalette(base_palette)
    # Reserve index 0 for unchanged-pixel transparency. This keeps the native
    # backdrop intact between frames instead of encoding it hundreds of times.
    opaque_palette = [0, 0, 0] + palette.getpalette()[:255 * 3]
    full_frames = []
    for frame in frames:
        indexed = frame.quantize(palette=palette, dither=Image.Dither.NONE).point([i + 1 if i < 255 else 1 for i in range(256)])
        indexed.putpalette(opaque_palette)
        full_frames.append(indexed)
    expected_hashes = [hashlib.sha256(frame.convert('RGB').tobytes()).hexdigest() for frame in full_frames]
    expected_set = set(expected_hashes)
    def runs(hashes, durations):
        result = []
        for pixel_hash, milliseconds in zip(hashes, durations):
            if result and result[-1][0] == pixel_hash:
                result[-1][1] += milliseconds
            else:
                result.append([pixel_hash, milliseconds])
        return result
    expected_runs = runs(expected_hashes, [int(f['displayMilliseconds']) for f in entries])
    gif_frames = [full_frames[0]]
    for previous, current in zip(full_frames, full_frames[1:]):
        identical_mask = ImageChops.difference(previous, current).point([255] + [0] * 255, mode='L')
        delta = current.copy()
        delta.paste(0, mask=identical_mask)
        gif_frames.append(delta)
    gif = out / filename
    gif_frames[0].save(gif, save_all=True, append_images=gif_frames[1:],
        duration=[int(f['displayMilliseconds']) for f in entries], loop=0, optimize=False, disposal=1, transparency=0,
        comment=f'OFFSCREEN ENGINE RENDER. Not a browser capture. No audio. {evidence_type}'.encode())
    with Image.open(gif) as check:
        duration = 0
        distinct = set()
        decoded_hashes = []
        decoded_durations = []
        for i in range(check.n_frames):
            check.seek(i)
            duration += check.info.get('duration', 0)
            decoded_hash = hashlib.sha256(check.convert('RGB').tobytes()).hexdigest()
            assert decoded_hash in expected_set, f'GIF compositing invented pixels at decoded frame {i}'
            decoded_hashes.append(decoded_hash)
            decoded_durations.append(check.info.get('duration', 0))
            distinct.add(decoded_hash)
        assert check.n_frames > 10, 'GIF export is static/trivial'
        assert len(distinct) > 1, 'GIF frames do not show actual renderer changes'
        assert decoded_hashes[0] == expected_hashes[0], 'GIF first frame differs from actual captured frame'
        assert decoded_hashes[-1] == expected_hashes[-1], 'GIF last frame differs from actual captured frame'
        assert runs(decoded_hashes, decoded_durations) == expected_runs, 'GIF pixel chronology or frame durations differ from captured sequence'
        return {'file': str(gif.relative_to(root)), 'sha256': digest(gif), 'bytes': gif.stat().st_size,
            'decodedFrames': check.n_frames, 'distinctDecodedFrames': len(distinct), 'displaySeconds': duration / 1000,
            'nativeSize': list(check.size), 'type': evidence_type,
            'encoding': 'Shared 255-color palette, unchanged-pixel transparency, disposal 1',
            'decodedPixelIntegrity': 'Every decoded frame equals a palette-quantized captured PNG; complete chronology and durations match'}

gif_meta = export_gif(index['montageFrames'], 'fragment-preview.gif',
    'Accelerated chronological native-render montage; not browser capture; no audio')
assert gif_meta['distinctDecodedFrames'] > 10, 'Chronology montage contains too few changing frames'
for clip in index.get('originalRateClips', []):
    clip['gif'] = export_gif(clip['frames'], f"offscreen-original-rate-{clip['id']}.gif",
        f"Native offscreen renderer, original story rate 1x, t={clip['from']}..{clip['to']}s, 10 fps; not browser; no audio")

index['contactSheets'] = contact_sheets()
index['poseSheets'] = pose_sheets()
index['gif'] = gif_meta
(out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'gif': gif_meta, 'originalRateClips': [c['gif'] for c in index.get('originalRateClips', [])],
    'contactSheets': len(index['contactSheets']), 'poseSheets': len(index['poseSheets'])}, ensure_ascii=False))
