import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { projectRoot, sha256 } from './native-harness.mjs';

const args = process.argv.slice(2);
const baseline = args.includes('--baseline-v2');
const destinationIndex = args.indexOf('--destination');
assert.ok(destinationIndex >= 0 && args[destinationIndex + 1], 'Provide an explicit scratch --destination');
const destination = path.resolve(args[destinationIndex + 1]);
const relative = 'production/qa-captures';
const original = path.join(projectRoot, relative);
const index = JSON.parse(fs.readFileSync(path.join(original, 'index.json'), 'utf8'));
for (const gif of [index.gif, ...index.originalRateClips.map(c => c.gif)]) {
  assert.match(gif.decodedPixelIntegrity, /^Every decoded frame equals/);
  assert.equal(sha256(fs.readFileSync(path.join(projectRoot, gif.file))), gif.sha256);
}
assert.equal(fs.existsSync(destination), false, 'Destination already exists; do not overwrite previous evidence');

function bytesIn(folder) {
  let total = 0;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    total += entry.isDirectory() ? bytesIn(full) : fs.statSync(full).size;
  }
  return total;
}
function rewrite(value, transform) {
  if (typeof value === 'string') return transform(value);
  if (Array.isArray(value)) return value.map(v => rewrite(v, transform));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, transform)]));
  return value;
}
if (baseline) {
  const snapshot = path.join(original, 'build-snapshot');
  const files = { ...index.sourceSha256,
    ...Object.fromEntries(Object.entries(index.imageFiles).map(([file, info]) => [`dist/${file}`, info.sha256])) };
  for (const [file, digest] of Object.entries(files)) {
    const bytes = fs.readFileSync(path.join(projectRoot, file));
    assert.equal(sha256(bytes), digest, `${file} has already changed; cannot invent an old source snapshot`);
    const target = path.join(snapshot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  fs.renameSync(original, destination);
  const relocated = rewrite(index, s => s.startsWith(`${relative}/`) ? path.join(destination, s.slice(relative.length + 1)) : s);
  relocated.status = 'HISTORICAL_NATIVE_BASELINE_NOT_BROWSER';
  relocated.storage = 'Scratch baseline, not a durable repository artifact';
  fs.writeFileSync(path.join(destination, 'index.json'), JSON.stringify(relocated, null, 2) + '\n');
  const regression = JSON.parse(fs.readFileSync(path.join(projectRoot, 'production/qa-regression.json'), 'utf8'));
  fs.copyFileSync(path.join(projectRoot, 'production/qa-regression.json'), path.join(destination, 'qa-regression.json'));
  const summary = { title: 'Historical V2 native QA baseline', status: relocated.status, savedAt: new Date().toISOString(),
    sourceSha256: index.sourceSha256, imageFiles: index.imageFiles,
    regression: { status: regression.status, counts: regression.counts, command: regression.command, checks: regression.tests },
    captures: { rawFrames: index.raw.length, authoredFrames: index.stagedPoses.length, runtimePoseVariants: index.runtimePoseFrameCount,
      contactCases: index.contactCases.length, gif: relocated.gif, originalRateClips: relocated.originalRateClips.map(({ id, from, to, gif }) => ({ id, from, to, gif })),
      contactSheets: relocated.contactSheets, poseSheets: relocated.poseSheets },
    scratchIndex: path.join(destination, 'index.json'), indexSha256: sha256(fs.readFileSync(path.join(destination, 'index.json'))),
    scratchBuildSnapshot: path.join(destination, 'build-snapshot'),
    bytes: bytesIn(destination), durability: 'Scratch baseline is transient. Essential defects are retained by the independent critic in production.',
    limitations: ['Not browser evidence', 'Not artistic acceptance', 'Will not describe later model/art changes'] };
  fs.writeFileSync(path.join(projectRoot, 'production/qa-baseline-v2.json'), JSON.stringify(summary, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ status: summary.status, destination, bytes: summary.bytes, manifest: 'production/qa-baseline-v2.json', gifBytes: summary.captures.gif.bytes }, null, 2) + '\n');
} else {
  fs.mkdirSync(destination, { recursive: true });
  const folders = ['montage', 'original-rate', 'clip-sequences'];
  const moved = [];
  for (const folder of folders) {
    const source = path.join(original, folder);
    if (!fs.existsSync(source)) continue;
    const target = path.join(destination, folder);
    fs.renameSync(source, target);
    moved.push({ folder, target, bytes: bytesIn(target) });
  }
  const relocated = rewrite(index, s => {
    for (const folder of folders) if (s.startsWith(`${relative}/${folder}/`)) return path.join(destination, s.slice(relative.length + 1));
    return s;
  });
  relocated.intermediates = { status: 'MOVED_TO_SCRATCH_AFTER_DECODED_PIXEL_VERIFICATION', command: `node tests/archive-qa-intermediates.mjs --destination ${destination}`,
    destination, moved, durable: false, regenerate: 'node tests/capture-offscreen.mjs',
    retained: 'All mandatory raw PNG/state, staged authored PNG/state, contact/pose sheets, GIFs and poster remain in production/qa-captures' };
  fs.writeFileSync(path.join(original, 'index.json'), JSON.stringify(relocated, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ status: relocated.intermediates.status, moved, retainedBytes: bytesIn(original) }, null, 2) + '\n');
}
