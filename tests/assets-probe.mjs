import assert from 'node:assert/strict';
import { createCanvas, cropAtlasFrame, loadNativeFiles, pixelStats, socketPixelDistance } from './native-harness.mjs';

/** Mechanical asset checks. These do not evaluate drawing quality. */
export async function inspectNativeAssets(loaded = undefined) {
  loaded ??= await loadNativeFiles();
  const { manifest, imagesByFile } = loaded;
  assert.deepEqual(manifest.logicalSize, [480, 360]);
  const actorFrames = [];
  for (const [id, spec] of Object.entries(manifest.actors)) {
    const image = imagesByFile[spec.image];
    assert.equal(image.width, spec.columns * spec.frameWidth, `${id} atlas width`);
    assert.equal(image.height, spec.rows * spec.frameHeight, `${id} atlas height`);
    const frameHashes = new Set();
    const names = new Set();
    for (const frame of spec.frames) {
      assert.ok(frame.index >= 0 && frame.index < spec.columns * spec.rows, `${id} frame index`);
      assert.ok(!names.has(frame.name), `${id} duplicate authored frame name ${frame.name}`);
      names.add(frame.name);
      const canvas = cropAtlasFrame(image, spec, frame.index);
      const stats = pixelStats(canvas);
      assert.ok(stats.opaque > 150, `${id} ${frame.name}: empty/trivial alpha frame`);
      assert.ok(stats.transparent > 100, `${id} ${frame.name}: frame lacks transparency`);
      assert.equal(stats.partial, 0, `${id} ${frame.name}: fractional alpha violates native pixel export`);
      assert.ok(stats.bounds[0] > 0 && stats.bounds[1] > 0 && stats.bounds[2] < spec.frameWidth && stats.bounds[3] < spec.frameHeight,
        `${id} ${frame.name}: sprite reaches cell edge and may be clipped`);
      if (frame.bounds) assert.deepEqual(stats.bounds, frame.bounds, `${id} ${frame.name}: bounds metadata disagrees with actual alpha`);
      const hand = frame.hand ?? frame.sockets?.hand ?? spec.sockets?.[frame.index]?.hand;
      assert.ok(Array.isArray(hand) && hand.length === 2, `${id} ${frame.name}: no authored hand socket`);
      const nearestHandPixel = socketPixelDistance(canvas, hand);
      assert.ok(nearestHandPixel <= 3.5, `${id} ${frame.name}: socket lies ${nearestHandPixel.toFixed(2)} px from opaque sprite`);
      assert.ok(stats.bounds[3] >= spec.pivot[1] - 3, `${id} ${frame.name}: feet drift above authored floor pivot`);
      assert.ok(!frameHashes.has(stats.rgbaSha256), `${id} ${frame.name}: repeated bitmap masquerades as another pose`);
      frameHashes.add(stats.rgbaSha256);
      actorFrames.push({ actor: id, frame: frame.index, name: frame.name, ...stats, nearestHandPixel });
    }
    for (const [pose, aliases] of Object.entries(spec.poses)) {
      const indices = Array.isArray(aliases) ? aliases : aliases.frames;
      assert.ok(Array.isArray(indices) && indices.length, `${id} ${pose}: empty pose alias`);
      for (const index of indices) assert.ok(spec.frames.some(f => f.index === index), `${id} ${pose}: missing atlas frame ${index}`);
    }
  }
  const props = [];
  for (const [id, spec] of Object.entries(manifest.props)) {
    const image = imagesByFile[spec.image];
    assert.equal(image.width, spec.width, `${id} prop width`);
    assert.equal(image.height, spec.height, `${id} prop height`);
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext('2d').drawImage(image, 0, 0);
    const stats = pixelStats(canvas);
    assert.ok(stats.opaque > 0 && stats.transparent > 0, `${id} has no cutout content/transparency`);
    assert.equal(stats.partial, 0, `${id} prop has partial alpha`);
    assert.ok(spec.pivot[0] >= 0 && spec.pivot[1] >= 0 && spec.pivot[0] < spec.width && spec.pivot[1] < spec.height);
    props.push({ id, ...stats });
  }
  for (const [side, spec] of Object.entries(manifest.backgrounds)) {
    const image = imagesByFile[spec.image];
    assert.deepEqual([image.width, image.height], manifest.logicalSize, `${side} background native dimensions`);
  }
  return { manifestSha256: loaded.manifestSha256, imageFiles: loaded.files, authoredFrameCount: actorFrames.length, actorFrames, props,
    limitations: ['Metadata/alpha checks do not certify anatomy, foot contact, attractive artwork or runtime layout.'] };
}
