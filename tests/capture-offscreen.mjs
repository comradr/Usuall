import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createCanvas, loadNativeFiles, projectRoot, sha256 } from './native-harness.mjs';
import { buildGeometry, renderFrame } from '../dist/engine.js';
import { stateAt, TOTAL_DURATION, BEATS, CUES } from '../dist/model.js';

const preliminary = process.argv.includes('--preliminary');
const plan = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tests/offscreen-plan.json'), 'utf8'));
const native = await loadNativeFiles();
const geometry = buildGeometry(native.manifest);
const assets = { manifest: native.manifest, images: native.imagesByFile };
const outputRelative = `production/qa-captures${preliminary ? '-preliminary' : ''}`;
const output = path.join(projectRoot, outputRelative);
for (const folder of ['raw', 'staged-poses', 'montage', 'mobile-world', 'clip-sequences']) fs.mkdirSync(path.join(output, folder), { recursive: true });
const sourceFiles = ['dist/model.js', 'dist/engine.js', 'dist/assets/manifest.json'];
const sourceSha256 = Object.fromEntries(sourceFiles.map(file => [file, sha256(fs.readFileSync(path.join(projectRoot, file)))]));
const identity = { sourceSha256, imageFiles: native.files, evidenceType: plan.evidenceType, renderer: 'dist/engine.js exported renderFrame',
  geometry: 'Final exported manifest measured hand sockets via production buildGeometry', nativeSizePerWorld: native.manifest.logicalSize,
  generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(output, 'build-sources.json'), JSON.stringify(identity, null, 2) + '\n');

const canvases = { store: createCanvas(480, 360), school: createCanvas(480, 360) };
const combined = createCanvas(960, 360), combinedCtx = combined.getContext('2d');
function actualRender(state) {
  for (const side of ['store', 'school']) renderFrame(canvases[side].getContext('2d'), state, side, assets, { ambientTime: state.elapsed });
  combinedCtx.imageSmoothingEnabled = false;
  combinedCtx.clearRect(0, 0, 960, 360);
  combinedCtx.drawImage(canvases.store, 0, 0); combinedCtx.drawImage(canvases.school, 480, 0);
  return combined.toBuffer('image/png');
}
function labelTime(time) { return time.toFixed(8).replace('.', '_'); }
function writePng(relative, bytes) {
  fs.writeFileSync(path.join(output, relative), bytes);
  return { file: path.posix.join(outputRelative, relative), sha256: sha256(bytes), bytes: bytes.length };
}
const rawByTime = new Map();
const raw = [], stagedPoses = [], contactCases = [], montageFrames = [], originalRateClips = [];
function captureRaw(time, reason) {
  time = Math.max(0, Math.min(TOTAL_DURATION, time));
  const key = time.toFixed(8);
  if (rawByTime.has(key)) {
    const entry = rawByTime.get(key); entry.reasons.push(reason); return entry;
  }
  const s = stateAt(time, { geometry });
  const png = writePng(`raw/t-${labelTime(time)}.png`, actualRender(s));
  const stateFile = path.posix.join(outputRelative, `raw/t-${labelTime(time)}.json`);
  fs.writeFileSync(path.join(projectRoot, stateFile), JSON.stringify(s, null, 2) + '\n');
  const entry = { storyTime: time, ...png, stateFile, reasons: [reason],
    world: { storePose: s.store.actor.pose, storeFrame: s.store.actor.frame, owner: s.store.bread.owner,
      schoolPose: s.school.actor.pose, schoolFrame: s.school.actor.frame, messages: s.dialogue.length } };
  raw.push(entry); rawByTime.set(key, entry); return entry;
}
function phaseSignature(s) {
  return [s.store.bread.owner, s.store.bread.packaged, s.store.actor.pose, s.store.phone.visible,
    s.school.actor.pose, s.school.phone.visible, s.school.lessonActive, !!s.school.board.contact,
    s.school.board.penDown, s.school.board.complete, s.school.pupils.some(p => p.raised),
    s.school.pupils[0]?.helped, s.dialogue.length, s.school.pupils.filter(p => p.visible).length].join('|');
}
const posesSeen = new Set(); let priorSignature;
for (let i = 0; i <= TOTAL_DURATION * plan.scanFrequencyHz; i++) {
  const time = i / plan.scanFrequencyHz, s = stateAt(time, { geometry });
  for (const side of ['store', 'school']) {
    const a = s[side].actor, key = `${a.id}|${a.pose}|${a.frame}|${a.facing}`;
    if (!posesSeen.has(key)) { posesSeen.add(key); captureRaw(time, `first runtime pose/frame: ${key}`); }
  }
  const signature = phaseSignature(s);
  if (signature !== priorSignature) {
    for (const delta of [-1 / 60, 0, 1 / 60]) captureRaw(time + delta, `runtime phase transition ${signature}; delta ${delta}`);
    priorSignature = signature;
  }
}
for (const time of new Set([0, TOTAL_DURATION, ...BEATS.flatMap(b => [b.start, b.end]), ...CUES.map(c => c.at), ...(plan.additionalBoundaries || [])])) {
  for (const delta of [-1 / 60, 0, 1 / 60]) captureRaw(time + delta, `authored shot/cue boundary ${time}; delta ${delta}`);
}

const importantCases = [
  ...[25, 32, 82, 91, 105, 120].map(time => ({ id: `bread-transfer-${time}`, time, side: 'store', kind: 'bread' })),
  ...[35, 38, 41, 44, 46.5].map(time => ({ id: `chalk-${time}`, time, side: 'school', kind: 'chalk' })),
  { id: 'pupil-hand', time: 50, side: 'school', kind: 'help' },
  { id: 'desk-help', time: 71, side: 'school', kind: 'help' },
  { id: 'lesson-break', time: 124, side: 'school', kind: 'school' },
  { id: 'nastya-phone-out', time: 130, side: 'school', kind: 'phone' },
  { id: 'nastya-first-send', time: 136, side: 'school', kind: 'phone' },
  { id: 'vova-phone-out', time: 147, side: 'store', kind: 'phone' },
  { id: 'vova-reply-hello', time: 152, side: 'store', kind: 'phone' },
  { id: 'vova-reply-bread', time: 159, side: 'store', kind: 'phone' },
  { id: 'vova-phone-return', time: 164, side: 'store', kind: 'phone' },
  { id: 'nastya-reply-1', time: 170, side: 'school', kind: 'phone' },
  { id: 'nastya-reply-2', time: 176, side: 'school', kind: 'phone' },
  { id: 'nastya-phone-return', time: 179, side: 'school', kind: 'phone' },
];
for (const item of importantCases) {
  const s = stateAt(item.time, { geometry }), world = s[item.side];
  let crop;
  if (item.kind === 'bread') crop = [Math.max(0, Math.min(330, world.bread.x - 65)), Math.max(0, Math.min(215, world.bread.y - 55)), 150, 145];
  else if (item.kind === 'chalk') crop = [164, 76, 195, 160];
  else if (item.kind === 'help') crop = [63, 176, 170, 160];
  else if (item.kind === 'phone') crop = [Math.max(0, Math.min(310, world.actor.x - 85)), Math.max(0, Math.min(205, world.actor.y - 112)), 170, 155];
  else crop = [0, 0, 480, 360];
  contactCases.push({ ...item, crop: crop.map(Math.round), frames: [-1 / 60, 0, 1 / 60].map(delta => captureRaw(item.time + delta, `${item.id}; delta ${delta}`)) });
}

// Staged source-pose audit: actual production renderer, deliberately forced
// authored frame, clear floor. It is labeled separately from the story replay.
for (const [id, spec] of Object.entries(native.manifest.actors)) for (const frame of spec.frames) {
  const side = id === 'vova' ? 'store' : 'school';
  const s = stateAt(0, { geometry }), a = s[side].actor;
  a.x = side === 'store' ? 250 : 275; a.y = 315;
  a.frame = frame.index; a.pose = frame.name; a.facing = 'left';
  const hand = frame.hand ?? frame.sockets?.hand ?? spec.sockets?.[frame.index]?.hand;
  a.hand = { x: a.x + hand[0] - spec.pivot[0], y: a.y + hand[1] - spec.pivot[1] };
  s.store.customer.visible = false; for (const p of s.school.pupils) p.visible = false;
  s[side].phone = { ...s[side].phone, owner: frame.name.includes('phone') ? 'hand' : 'pocket',
    visible: frame.name.includes('phone'), x: a.hand.x, y: a.hand.y };
  const slug = frame.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const png = writePng(`staged-poses/${id}-${String(frame.index).padStart(3, '0')}-${slug}.png`, actualRender(s));
  const stateFile = path.posix.join(outputRelative, `staged-poses/${id}-${String(frame.index).padStart(3, '0')}-${slug}.json`);
  fs.writeFileSync(path.join(projectRoot, stateFile), JSON.stringify(s, null, 2) + '\n');
  stagedPoses.push({ actor: id, frame: frame.index, name: frame.name, side, ...png, stateFile,
    type: 'staged forced-frame audit; not an automatically occurring story moment', crop: [a.x - 62, a.y - 112, 124, 116] });
}

for (const shot of plan.montage) {
  const count = Math.ceil((shot.to - shot.from) / shot.rate * plan.outputFramesPerSecond);
  for (let i = 0; i < count; i++) {
    const time = Math.min(shot.to - 1e-8, shot.from + i * shot.rate / plan.outputFramesPerSecond);
    const index = montageFrames.length, s = stateAt(time, { geometry });
    montageFrames.push({ index, storyTime: time, window: shot.id, displayMilliseconds: 1000 / plan.outputFramesPerSecond,
      ...writePng(`montage/f-${String(index).padStart(4, '0')}.png`, actualRender(s)) });
  }
}
for (const clip of plan.originalRateClips) {
  const count = Math.ceil((clip.to - clip.from) * plan.outputFramesPerSecond);
  const frames = [];
  fs.mkdirSync(path.join(output, 'clip-sequences', clip.id), { recursive: true });
  for (let i = 0; i < count; i++) {
    const time = clip.from + i / plan.outputFramesPerSecond;
    const state = stateAt(time, { geometry });
    const frame = writePng(`clip-sequences/${clip.id}/f-${String(i).padStart(4, '0')}.png`, actualRender(state));
    frames.push({ ...frame, storyTime: time, index: i, displayMilliseconds: 1000 / plan.outputFramesPerSecond });
  }
  originalRateClips.push({ ...clip, frames,
    type: 'Native offscreen renderer, original story rate 1x, 10 fps; no browser/audio' });
}
const poster = captureRaw(41, 'poster: bread staging / arithmetic work in parallel');
fs.copyFileSync(path.join(projectRoot, poster.file), path.join(output, 'fragment-poster.png'));
const mobileWorld = [];
for (const time of [25, 41, 71, 105, 120, 136, 159, 176, 189]) {
  const s = stateAt(time, { geometry }); actualRender(s);
  for (const side of ['store', 'school']) {
    const scaled = createCanvas(320, 240), ctx = scaled.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvases[side], 0, 0, 320, 240);
    mobileWorld.push({ storyTime: time, side, displayWidth: 320, ...writePng(`mobile-world/${side}-${labelTime(time)}-320.png`, scaled.toBuffer('image/png')),
      limitation: plan.mobileLimit });
  }
}

for (const [file, hash] of Object.entries(sourceSha256)) assert.equal(sha256(fs.readFileSync(path.join(projectRoot, file))), hash,
  `${file} changed during capture. Rerun rather than label stale images as the current build.`);
for (const [file, meta] of Object.entries(native.files)) assert.equal(sha256(fs.readFileSync(path.join(projectRoot, 'dist', file))), meta.sha256,
  `${file} changed during capture. Rerun required.`);

const index = { ...identity, command: `node tests/capture-offscreen.mjs${preliminary ? ' --preliminary' : ''}`,
  status: 'CAPTURED_NOT_BROWSER', storyDuration: TOTAL_DURATION, scanFrequencyHz: plan.scanFrequencyHz,
  scanStateCount: TOTAL_DURATION * plan.scanFrequencyHz + 1, runtimePoseFrameCount: posesSeen.size,
  raw, stagedPoses, contactCases, mobileWorld, montageFrames, originalRateClips, plan,
  gifDisplaySeconds: montageFrames.reduce((n, f) => n + f.displayMilliseconds, 0) / 1000,
  poster: { file: path.posix.join(outputRelative, 'fragment-poster.png'), sourceStoryTime: 41, sha256: poster.sha256 },
  limitations: [plan.evidenceType, plan.mobileLimit, plan.gifLimit, 'No browser/HTML, actual device input, sound or performance claims.'] };
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
const python = spawnSync('python', [path.join(projectRoot, 'tests/build-offscreen-review.py'), output], { encoding: 'utf8' });
if (python.stdout) process.stdout.write(python.stdout);
if (python.status !== 0) throw new Error(python.stderr || `Review export failed: ${python.status}`);
process.stdout.write(JSON.stringify({ status: index.status, output: outputRelative, rawFrames: raw.length,
  authoredStagedFrames: stagedPoses.length, runtimePoseFrames: posesSeen.size, contactCases: contactCases.length,
  montageFrames: montageFrames.length, montageSeconds: index.gifDisplaySeconds, sourceSha256 }, null, 2) + '\n');
