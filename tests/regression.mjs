import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage, loadNativeFiles } from './native-harness.mjs';
import { inspectNativeAssets } from './assets-probe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelOnly = process.argv.includes('--model-only');
const preliminary = process.argv.includes('--preliminary');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'tests/acceptance-contract.json'), 'utf8'));
const report = {
  title: 'Technical deterministic regression · S02–S03',
  reviewer: { kind: 'producer_native_checks', independent: false, context_id: '/root' },
  createdAt: new Date().toISOString(),
  command: `node tests/regression.mjs${modelOnly ? ' --model-only' : ''}${preliminary ? ' --preliminary' : ''}`,
  workingDirectory: root,
  nodeVersion: process.version,
  scope: contract.scope,
  environment: 'Node, injected clock/storage, no browser',
  status: 'RUNNING',
  sourceSha256: {},
  tests: [],
  notChecked: [
    'Real browser startup, HTML/CSS layout and mobile text readability',
    'Touch/keyboard events, PIP/focus overlays and DOM controls',
    'Actual browser audio output and autoplay policy',
    'Browser FPS and real tab suspension',
    'Complete game outside S02–S03',
    'Artistic sign-off (separate independent critic)'
  ]
};
if (modelOnly) {
  report.environment = 'Node, pure state model and simulated storage, no browser';
  report.notChecked.unshift('Final authored geometry, exact sprite contacts and route collisions', 'Renderer, asset pixels and playback clock/advance');
}
function digest(file) { return createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'); }
async function test(id, purpose, run) {
  const started = performance.now();
  try {
    const evidence = await run();
    report.tests.push({ id, purpose, status: 'PASS', milliseconds: +(performance.now() - started).toFixed(3), evidence: evidence ?? {} });
    process.stdout.write(`PASS ${id}: ${purpose}\n`);
  } catch (error) {
    report.tests.push({ id, purpose, status: 'FAIL', milliseconds: +(performance.now() - started).toFixed(3), error: error.message, evidence: error.evidence ?? {}, stack: error.stack });
    process.stdout.write(`FAIL ${id}: ${error.message}\n`);
  }
}
function writeReport() {
  const counts = { pass: 0, fail: 0 };
  for (const t of report.tests) counts[t.status === 'PASS' ? 'pass' : 'fail']++;
  report.counts = counts;
  report.status = counts.fail ? 'FAIL' : 'PASS';
  fs.mkdirSync(path.join(root, 'production'), { recursive: true });
  const stem = modelOnly ? 'qa-model-regression' : preliminary ? 'qa-regression-preliminary' : 'qa-regression';
  fs.writeFileSync(path.join(root, `production/${stem}.json`), JSON.stringify(report, null, 2) + '\n');
  const lines = [
    '# QA · deterministic regression', '',
    `Status: **${report.status}**. ${counts.pass} passed, ${counts.fail} failed.`, '',
    `Command: \`${report.command}\` from \`${root}\`. Node \`${process.version}\`.`, '',
    'These tests exercise the real model and injected game clock/storage. They do not run in a browser.', '',
    '| ID | Purpose | Outcome |', '|---|---|---|',
    ...report.tests.map(t => `| ${t.id} | ${t.purpose} | ${t.status} |`), '',
    '## Findings', '',
    ...report.tests.filter(t => t.status === 'FAIL').map(t => `- ${t.id}: ${t.error}`),
    ...(counts.fail ? [] : ['No deterministic regression failure was observed in the checked scope.']), '',
    '## NOT_CHECKED', '', ...report.notChecked.map(v => `- ${v}`), '',
    `Full assertions, sampled-frame counts, source SHA-256 and errors are in \`${stem}.json\`.`, ''
  ];
  fs.writeFileSync(path.join(root, `production/${stem}.md`), lines.join('\n'));
  process.stdout.write(`RESULT ${report.status}: ${counts.pass} pass, ${counts.fail} fail\n`);
  if (counts.fail) process.exitCode = 1;
}

const story = JSON.parse(fs.readFileSync(path.join(root, 'src/story.json'), 'utf8'));
await test('CANON-01', 'The playable story contains exactly S02/S03, 15 continuous shots and 189 seconds', () => {
  assert.deepEqual(story.scope, contract.scope);
  assert.deepEqual(story.scenes.map(s => s.id), contract.scope);
  assert.equal(story.scenes.reduce((n, s) => n + s.shots.length, 0), 15);
  const ends = story.scenes.map(scene => {
    let prior = 0;
    for (const shot of scene.shots) {
      assert.equal(shot.secondsStart, prior);
      assert.ok(shot.secondsEnd > prior);
      prior = shot.secondsEnd;
    }
    return prior;
  });
  assert.deepEqual(ends, [102, 87]);
  assert.equal(ends.reduce((a, b) => a + b, 0), contract.durationSeconds);
  return { sceneDurations: ends, shots: 15 };
});
await test('CANON-02', 'Five exact original messages retain IDs, speakers, text and order', () => {
  const dialogue = story.scenes.flatMap(s => s.dialogue);
  assert.deepEqual(dialogue.map(({ id, speaker, text }) => ({ id, speaker, text })), contract.dialogue);
  assert.ok(dialogue.every(m => m.id === m.sourceId));
  return { messageIds: dialogue.map(m => m.id) };
});

let model, engine, native, geometry, runtimeAssets;
function stateAt(seconds) { return model.stateAt(seconds, { geometry }); }
await test('API-01', 'The real model is importable without browser globals', async () => {
  model = await import(path.join(root, 'dist/model.js'));
  for (const name of ['stateAt', 'makeSave', 'validateSave', 'loadSave', 'saveToStorage']) assert.equal(typeof model[name], 'function', name);
  assert.equal(model.TOTAL_DURATION, 189);
  for (const file of ['dist/model.js', 'src/story.json']) report.sourceSha256[file] = digest(file);
  return { exports: Object.keys(model) };
});
if (!modelOnly) await test('API-02', 'The real renderer/clock are importable without browser globals', async () => {
  engine = await import(path.join(root, 'dist/engine.js'));
  assert.equal(typeof engine.renderFrame, 'function');
  assert.equal(typeof engine.createGame, 'function');
  report.sourceSha256['dist/engine.js'] = digest('dist/engine.js');
  return { exports: Object.keys(engine) };
});
if (!modelOnly && engine) await test('ASSET-01', 'Actual PNGs have native dimensions, alpha, distinct frames and measured opaque hand sockets', async () => {
  native = await loadNativeFiles();
  report.sourceSha256['dist/assets/manifest.json'] = native.manifestSha256;
  report.assetSha256 = native.files;
  assert.equal(typeof engine.buildGeometry, 'function', 'Production geometry adapter must be exported for exact runtime QA');
  geometry = engine.buildGeometry(native.manifest);
  runtimeAssets = { manifest: native.manifest, images: native.imagesByFile };
  report.geometry = 'Actual measured manifest via production buildGeometry adapter';
  return await inspectNativeAssets(native);
});
if (!modelOnly && engine && native) await test('ASSET-02', 'Default createGame loader resolves every manifest image to an existing dist file', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  let game;
  try {
    globalThis.fetch = async url => {
      const actual = fileURLToPath(url);
      assert.equal(actual, path.join(root, 'dist/assets/manifest.json'));
      return { ok: true, json: async () => native.manifest };
    };
    const imageLoader = async url => {
      const actual = fileURLToPath(url);
      assert.ok(actual.startsWith(path.join(root, 'dist') + path.sep));
      assert.ok(fs.existsSync(actual), `Production loader resolved nonexistent file: ${actual}`);
      requested.push(path.relative(path.join(root, 'dist'), actual));
      return await loadImage(fs.readFileSync(actual));
    };
    game = await engine.createGame({ storeCanvas: createCanvas(480, 360), schoolCanvas: createCanvas(480, 360),
      imageLoader, storage: null, listenVisibility: false, clock: { now: () => 0, requestFrame: () => 1, cancelFrame: () => {} } });
    assert.equal(game.getSnapshot().phase, 'ready');
    assert.equal(game.getSnapshot().store.bread.owner, 'crate');
    assert.deepEqual([...requested].sort(), Object.keys(native.files).sort());
    return { defaultManifestUsed: true, requestedFiles: requested, realFileReads: requested.length,
      note: 'Filesystem-backed fetch/image-loader substitutes; actual production URL resolution and createGame path are tested. No browser.' };
  } finally {
    game?.destroy();
    globalThis.fetch = originalFetch;
  }
});

if (model) {
  await test('WORLD-01', 'Every 60 Hz sample conserves the one loaf through all ownership transfers', () => {
    const transitions = [];
    let priorOwner, breadId;
    const frames = 189 * 60 + 1;
    for (let i = 0; i < frames; i++) {
      const t = i / 60;
      const s = stateAt(t);
      const loaf = s.store.bread;
      assert.ok(['crate', 'hand', 'stage', 'trolley', 'shelf'].includes(loaf.owner), `Unknown bread owner at ${t}`);
      if (i === 0) breadId = loaf.id;
      assert.equal(loaf.id, breadId, `Bread identity changed at ${t}`);
      assert.equal(s.store.totalBread, contract.trackedBread.countInitially, `Total bread changed at ${t}`);
      assert.equal(s.store.sourceCount, loaf.owner === 'crate' ? 6 : 5, `Crate count disagrees with ownership at ${t}`);
      assert.ok(Number.isFinite(loaf.x) && Number.isFinite(loaf.y), `Bread position is non-finite at ${t}`);
      if (loaf.owner !== priorOwner) {
        transitions.push({ time: t, owner: loaf.owner, packaged: loaf.packaged });
        priorOwner = loaf.owner;
      }
      if (loaf.owner === 'trolley' || loaf.owner === 'shelf') assert.equal(loaf.packaged, true, `Unpacked bread transferred at ${t}`);
    }
    assert.deepEqual(transitions.map(x => x.owner), contract.trackedBread.ownerSequence);
    assert.equal(stateAt(102).store.bread.owner, 'trolley');
    assert.equal(stateAt(189).store.bread.owner, 'shelf');
    return { framesChecked: frames, breadId, transitions };
  });

  await test('WORLD-02', 'Scene boundary preserves packed loaf, board and message state', () => {
    const before = stateAt(102 - 1e-6), after = stateAt(102);
    assert.equal(before.sceneId, 'S02');
    assert.equal(after.sceneId, 'S03');
    for (const key of ['id', 'owner', 'packaged']) assert.equal(before.store.bread[key], after.store.bread[key]);
    assert.equal(before.store.sourceCount, after.store.sourceCount);
    assert.equal(before.school.board.progress, after.school.board.progress);
    assert.equal(after.school.board.complete, true);
    assert.deepEqual(after.dialogue, []);
    return { boundary: 102, breadOwner: after.store.bread.owner, boardComplete: true };
  });

  await test('NAR-01', 'No phone before break or while carrying bread; five messages follow physical phone actions', () => {
    let priorCount = 0;
    const emissions = [];
    for (let i = 0; i <= 189 * 60; i++) {
      const t = i / 60, s = stateAt(t);
      const school = s.school, store = s.store;
      if (school.lessonActive || t < 124) assert.equal(school.phone.visible, false, `Teacher phone during lesson at ${t}`);
      if (store.bread.owner === 'hand') assert.equal(store.phone.visible, false, `Phone and bread overlap at ${t}`);
      assert.ok(s.dialogue.length >= priorCount, `Dialogue disappeared at ${t}`);
      assert.ok(s.dialogue.length <= 5, `Invented dialogue at ${t}`);
      assert.deepEqual(s.dialogue.map(({ id, speaker, text }) => ({ id, speaker, text })), contract.dialogue.slice(0, s.dialogue.length));
      if (t < 136) assert.equal(s.dialogue.length, 0, `Dialogue before 03.04 at ${t}`);
      for (let j = priorCount; j < s.dialogue.length; j++) {
        const message = s.dialogue[j];
        const actorSide = message.speaker === 'Настя' ? school : store;
        assert.equal(actorSide.phone.owner, 'hand', `Message ${message.id} appeared before physical phone at ${t}`);
        assert.equal(actorSide.phone.visible, true);
        if (message.speaker === 'Вова') assert.equal(store.bread.owner, 'shelf', `Vova replied before release at ${t}`);
        emissions.push({ time: t, id: message.id, senderPhone: actorSide.phone.owner });
      }
      priorCount = s.dialogue.length;
    }
    const end = stateAt(189);
    assert.equal(end.dialogue.length, 5);
    assert.equal(end.store.phone.visible, false);
    assert.equal(end.school.phone.visible, false);
    return { framesChecked: 11341, emissions };
  });

  await test('NAR-02', 'Chalk contact precedes visible progress and completed arithmetic persists', () => {
    let progress = 0, contacts = 0, firstMark;
    for (let i = 0; i <= 189 * 60; i++) {
      const t = i / 60, s = stateAt(t), b = s.school.board;
      assert.ok(Number.isFinite(b.progress) && b.progress >= 0 && b.progress <= 1);
      assert.ok(b.progress >= progress, `Chalk disappeared at ${t}`);
      if (b.contact) contacts++;
      if (b.progress > progress) {
        assert.ok(b.contact || contacts > 0, `Chalk marks appeared without prior contact at ${t}`);
        if (firstMark === undefined) firstMark = t;
      }
      if (t >= 48) {
        assert.equal(b.complete, true, `Example incomplete at ${t}`);
        assert.equal(b.progress, 1);
        assert.equal(b.equation, contract.lesson.arithmetic);
      }
      progress = b.progress;
    }
    assert.ok(contacts > 0);
    assert.ok(firstMark >= 35 && firstMark < 48);
    return { framesChecked: 11341, firstMark, contactFrames: contacts, arithmetic: contract.lesson.arithmetic };
  });

  await test('NAR-03', 'Teacher phone starts after pupils leave and remains held for each canonical send', () => {
    let firstVisible;
    const ownershipChanges = [];
    let priorOwner;
    for (let i = 124 * 60; i <= 189 * 60; i++) {
      const time = i / 60, school = stateAt(time).school;
      if (school.phone.visible) {
        firstVisible ??= time;
        assert.equal(school.pupils.filter(p => p.visible).length, 0, `Teacher takes phone before pupils exit at ${time}`);
        assert.equal(school.phone.owner, 'hand');
      }
      if (school.phone.owner !== priorOwner) ownershipChanges.push({ time, owner: school.phone.owner });
      priorOwner = school.phone.owner;
    }
    assert.ok(firstVisible > 124 && firstVisible < 136, 'Phone pickup must occur during the break before first send');
    assert.deepEqual(ownershipChanges.map(c => c.owner), ['pocket', 'hand', 'pocket']);
    return { firstVisible, ownershipChanges, sampledFrames: 3901, limitation: 'World timing/ownership; gesture craft needs independent visual review' };
  });

  await test('SAVE-01', 'Reload roundtrip preserves ownership, chalk and chat at eleven intermediate/end times', () => {
    const memory = new Map();
    const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
    const times = [0, 25.2, 30, 45, 85, 97, 109, 123, 151, 171, 189];
    for (const elapsed of times) {
      const original = model.makeSave(elapsed, { speed: 1.5, muted: false, reducedMotion: true });
      assert.equal(model.saveToStorage(storage, original), true);
      const restored = model.loadSave(storage);
      assert.deepEqual(restored, original);
      assert.deepEqual(stateAt(restored.elapsed), stateAt(elapsed));
      assert.deepEqual(restored.prefs, { speed: 1.5, muted: false, reducedMotion: true });
      assert.equal(memory.size, 1);
    }
    assert.equal(model.clearSave(storage), true);
    assert.equal(model.loadSave(storage), null);
    return { roundtrips: times.length, times, saveKey: model.SAVE_KEY, clearVerified: true };
  });
  await test('SAVE-02', 'Malformed, stale, oversized and non-finite save data fail closed', () => {
    const valid = model.makeSave(83.75);
    const malformed = [null, false, 7, 'save', [], {},
      { ...valid, version: -1 }, { ...valid, model: 'old-model' },
      { ...valid, elapsed: -1 }, { ...valid, elapsed: 190 },
      { ...valid, elapsed: NaN }, { ...valid, elapsed: Infinity },
      { ...valid, elapsed: '83.75' }, { ...valid, prefs: null },
      { ...valid, prefs: [] }, { ...valid, prefs: 'fast' }];
    for (const input of malformed) assert.equal(model.validateSave(input), null);
    const rawCases = ['{', 'null', '[]', '{}', ' '.repeat(16385), JSON.stringify({ ...valid, elapsed: 190 })];
    for (const raw of rawCases) assert.equal(model.loadSave({ getItem: () => raw }), null);
    return { malformedInputs: malformed.length, malformedRawStrings: rawCases.length };
  });
  await test('SAVE-03', 'Blocked storage and quota errors do not throw or overwrite the last valid save', () => {
    const old = JSON.stringify(model.makeSave(97));
    const storage = {
      getItem: () => old,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => { throw new Error('SecurityError'); }
    };
    assert.equal(model.saveToStorage(storage, model.makeSave(172)), false);
    assert.equal(model.loadSave(storage).elapsed, 97);
    assert.equal(model.clearSave(storage), false);
    assert.equal(model.loadSave({ getItem() { throw new Error('SecurityError'); } }), null);
    assert.equal(model.saveToStorage(undefined, model.makeSave(1)), false);
    return { injectedFailures: ['QuotaExceededError', 'SecurityError', 'absent storage'], lastValidElapsed: 97 };
  });
  await test('SAVE-04', 'Unsupported preferences are sanitized into supported finite values', () => {
    const save = model.validateSave({ ...model.makeSave(8), prefs: { speed: Infinity, muted: 'false', reducedMotion: 'true', extra: 'ignored' } });
    assert.deepEqual(save.prefs, { speed: 1, muted: true, reducedMotion: false });
    const unusual = model.validateSave({ ...model.makeSave(8), prefs: JSON.parse('{"__proto__":{"polluted":true}}') });
    assert.equal(unusual.prefs.speed, 1);
    assert.equal({}.polluted, undefined);
    return { normalizedPreferences: save.prefs, prototypePollution: false };
  });
  await test('WORLD-03', 'Non-finite/out-of-range timeline input remains inside the supported fragment', () => {
    for (const input of [NaN, Infinity, -Infinity, undefined, null, '7']) assert.equal(stateAt(input).elapsed, 0);
    assert.equal(stateAt(-5).elapsed, 0);
    assert.equal(stateAt(200).elapsed, 189);
    for (const elapsed of [0, 25, 35, 94, 102, 136, 189]) assert.deepEqual(stateAt(elapsed), stateAt(elapsed));
    return { extremeInputs: 8, repeatedStates: 7 };
  });
}

if (!modelOnly && engine && runtimeAssets && geometry) {
  function authoredHand(person) {
    const spec = native.manifest.actors[person.id];
    const frame = spec.frames.find(f => f.index === person.frame);
    assert.ok(frame, `${person.id} uses unauthored frame ${person.frame}`);
    const hand = frame.hand ?? frame.sockets?.hand ?? spec.sockets?.[person.frame]?.hand;
    const pivot = frame.pivot ?? spec.pivot;
    return { x: Math.round(person.x) + (person.facing === 'right' ? -1 : 1) * (hand[0] - pivot[0]),
      y: Math.round(person.y) + hand[1] - pivot[1] };
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  await test('GEO-01', 'Held loaf and phone attach to the actual bitmap frame hand, not a synthetic target', () => {
    let frames = 0, maximum = 0;
    for (let i = 0; i <= 189 * 60; i++) {
      const s = stateAt(i / 60);
      for (const side of ['store', 'school']) {
        const world = s[side], hand = authoredHand(world.actor);
        assert.ok(distance(hand, world.actor.hand) <= 1, `Adapter socket disagrees with bitmap hand at ${i / 60} ${side}`);
        if (side === 'store' && world.bread.owner === 'hand') {
          const d = distance(hand, world.bread); maximum = Math.max(maximum, d);
          assert.ok(d <= 3, `Held loaf is ${d.toFixed(2)} px from actual hand at ${i / 60}`); frames++;
        }
        if (world.phone.visible) {
          const d = distance(hand, world.phone); maximum = Math.max(maximum, d);
          assert.ok(d <= 3, `Phone is ${d.toFixed(2)} px from actual hand at ${i / 60} ${side}`); frames++;
        }
      }
    }
    return { propFramesChecked: frames, maximumDistanceNativePixels: maximum, toleranceNativePixels: 3 };
  });
  await test('GEO-02', 'All six ownership boundaries touch the prior/new object anchor within three native pixels', () => {
    const boundaries = [], violations = [];
    for (const time of [25, 32, 82, 91, 105, 120]) {
      const before = stateAt(time - 1 / 60).store, after = stateAt(time).store, following = stateAt(time + 1 / 60).store;
      assert.notEqual(before.bread.owner, after.bread.owner, `Expected physical transfer at ${time}`);
      const handBefore = authoredHand(before.actor), handAfter = authoredHand(after.actor);
      const priorContact = distance(handBefore, before.bread), nextContact = distance(handAfter, after.bread);
      const objectStep = distance(before.bread, after.bread);
      if (priorContact > 3) violations.push(`No prior contact at ${time}: ${priorContact.toFixed(2)} px`);
      if (nextContact > 3) violations.push(`No new contact at ${time}: ${nextContact.toFixed(2)} px`);
      if (objectStep > 3) violations.push(`Bread teleports ${objectStep.toFixed(2)} px at ${time}`);
      boundaries.push({ time, beforeOwner: before.bread.owner, afterOwner: after.bread.owner, priorContact, nextContact, objectStep,
        afterOneFrame: following.bread });
    }
    if (violations.length) {
      const error = new Error(violations.join('; ')); error.evidence = { boundaries, violations }; throw error;
    }
    return { boundaries, toleranceNativePixels: 3 };
  });
  await test('GEO-03', 'Drawing chalk remains at the actual hand while both feet remain on the board floor plane', () => {
    let frames = 0, maximum = 0, firstFeetY, worst;
    const violations = [];
    for (let i = 35 * 60; i < 48 * 60; i++) {
      const t = i / 60, school = stateAt(t).school;
      if (!school.board.contact || !school.board.penDown) continue;
      firstFeetY ??= school.actor.y;
      if (Math.abs(school.actor.y - firstFeetY) > 1 && violations.length < 12) violations.push(`Teacher floats vertically while writing at ${t}`);
      const hand = authoredHand(school.actor), d = distance(hand, school.board.contact);
      if (d > maximum) { maximum = d; worst = { time: t, frame: school.actor.frame, hand, chalkContact: school.board.contact, feet: [school.actor.x, school.actor.y] }; }
      if (d > 4 && violations.length < 12) violations.push(`Chalk tip is ${d.toFixed(2)} px away from actual bitmap hand at ${t}`);
      frames++;
    }
    assert.ok(frames > 30);
    if (violations.length) {
      const error = new Error(violations.join('; ')); error.evidence = { contactFrames: frames, maximumDistanceNativePixels: maximum, worst, firstFeetY }; throw error;
    }
    return { contactFrames: frames, maximumDistanceNativePixels: maximum, floorY: firstFeetY, toleranceNativePixels: 4 };
  });
  await test('GEO-06', 'Lifted writing hand stays near the board between strokes instead of falling to the hip', () => {
    let liftedFrames = 0, lowestHand = -Infinity;
    const frames = new Set();
    for (let i = 35 * 60; i < 46.5 * 60; i++) {
      const time = i / 60, school = stateAt(time).school;
      if (!school.board.contact || school.board.penDown) continue;
      const hand = authoredHand(school.actor);
      assert.ok(hand.y <= school.actor.y - 50, `Writing hand drops to hip during pen-up at ${time}: y=${hand.y}`);
      assert.ok(Math.abs(school.actor.y - 197) <= 1, `Pen-up changes board floor plane at ${time}`);
      lowestHand = Math.max(lowestHand, hand.y);
      frames.add(school.actor.frame); liftedFrames++;
    }
    assert.ok(liftedFrames > 10, 'No substantive pen-up phase checked');
    return { liftedFrames, lowestHandY: lowestHand, authoredFrames: [...frames], floorY: 197,
      limitation: 'Detects hip-level arm drop; does not certify opposite-step gait or drawing quality' };
  });
  await test('GEO-04', 'Main actor feet route around the real background furniture at every 60 Hz sample', () => {
    const violations = [];
    let positionsChecked = 0;
    for (let i = 0; i <= 189 * 60; i++) {
      const s = stateAt(i / 60);
      for (const side of ['store', 'school']) {
        const p = s[side].actor;
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
        for (const [x, y, width, height] of native.manifest.obstacles[side]) {
          if (p.x >= x && p.x < x + width && p.y >= y && p.y < y + height) {
            if (violations.length < 12) violations.push({ time: i / 60, side, pose: p.pose, x: p.x, y: p.y, obstacle: [x, y, width, height] });
          }
        }
        positionsChecked++;
      }
    }
    assert.deepEqual(violations, [], `Feet enter furniture: ${JSON.stringify(violations)}`);
    return { positionsChecked, geometrySource: 'actual manifest obstacles', footprint: 'floor pivot point; visual limb/body occlusion reviewed separately' };
  });
  await test('GEO-05', 'Walking pupils avoid furniture except the short approach/exit to their own seated desk', () => {
    const rects = native.manifest.obstacles.school;
    const inside = (p, [x, y, w, h]) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
    const seats = Object.fromEntries(stateAt(11).school.pupils.map(p => [p.id, { x: p.x, y: p.y }]));
    const assignedDesks = Object.fromEntries(Object.entries(seats).map(([id, p]) => [id, rects.filter(r => inside(p, r))]));
    const exceptions = {}, violations = [];
    let walkingPositionsChecked = 0;
    for (let i = 0; i <= 189 * 60; i++) {
      const time = i / 60;
      for (const pupil of stateAt(time).school.pupils) {
        if (!pupil.visible || !pupil.walking) continue;
        walkingPositionsChecked++;
        for (const rect of rects) {
          if (!inside(pupil, rect)) continue;
          const seat = seats[pupil.id], seatDistance = Math.hypot(pupil.x - seat.x, pupil.y - seat.y);
          const ownDesk = assignedDesks[pupil.id].includes(rect);
          const isSeatingWindow = time < 10 || (time >= 124 && time < 131);
          if (!ownDesk || !isSeatingWindow || seatDistance > 60) {
            if (violations.length < 12) violations.push({ time, pupil: pupil.id, x: pupil.x, y: pupil.y, rect, seatDistance, ownDesk });
          } else {
            const key = `${pupil.id}|${time < 10 ? 'approach' : 'exit'}`;
            exceptions[key] ??= { pupil: pupil.id, type: time < 10 ? 'approach' : 'exit', rect, frames: 0, maximumSeatDistance: 0 };
            exceptions[key].frames++;
            exceptions[key].maximumSeatDistance = Math.max(exceptions[key].maximumSeatDistance, seatDistance);
          }
        }
      }
    }
    assert.deepEqual(violations, [], `Pupil route crosses unrelated furniture: ${JSON.stringify(violations)}`);
    return { walkingPositionsChecked, allowedOwnDeskReachNativePixels: 60, allowedExceptions: Object.values(exceptions),
      limitation: 'Floor pivot collision check. Own-desk seating approach/exit is intentional; limb/body layering is reviewed visually.' };
  });
  await test('RENDER-01', 'Every rendered store frame draws exactly six loaf images with one moving owner', () => {
    const ctx = createCanvas(480, 360).getContext('2d');
    const raw = native.imagesByFile[native.manifest.props.bread.image], packed = native.imagesByFile[native.manifest.props.breadPacked.image];
    const times = [0, 24.99, 25, 27.9, 28, 31.99, 32, 81.99, 82, 90.99, 91, 104.99, 105, 119.99, 120, 189];
    let rawCalls = 0, packedCalls = 0;
    const original = ctx.drawImage.bind(ctx);
    ctx.drawImage = (image, ...args) => { if (image === raw) rawCalls++; if (image === packed) packedCalls++; return original(image, ...args); };
    const traces = [];
    for (const time of times) {
      rawCalls = 0; packedCalls = 0;
      const s = stateAt(time);
      engine.renderFrame(ctx, s, 'store', runtimeAssets);
      assert.equal(rawCalls + packedCalls, 6, `Rendered bread count at ${time}`);
      assert.equal(packedCalls, s.store.bread.packaged ? 1 : 0, `Duplicate/lost packed bread at ${time}`);
      traces.push({ time, rawCalls, packedCalls, owner: s.store.bread.owner });
    }
    return { traces, note: 'Actual PNG draw calls, not inventory metadata alone. Background is the separately authored static layer.' };
  });
  await test('RENDER-02', 'The raised pupil hand changes visible pixels above the head after furniture occlusion', () => {
    const raised = stateAt(53), lowered = structuredClone(raised);
    const pupil = raised.school.pupils.find(p => p.raised);
    assert.ok(pupil?.visible, 'No raised pupil at the authored raised-hand moment');
    lowered.school.pupils.find(p => p.id === pupil.id).raised = false;
    const beforeCanvas = createCanvas(480, 360), afterCanvas = createCanvas(480, 360);
    engine.renderFrame(beforeCanvas.getContext('2d'), lowered, 'school', runtimeAssets);
    engine.renderFrame(afterCanvas.getContext('2d'), raised, 'school', runtimeAssets);
    const a = beforeCanvas.getContext('2d').getImageData(0, 0, 480, 360).data;
    const b = afterCanvas.getContext('2d').getImageData(0, 0, 480, 360).data;
    let visibleChangedPixels = 0, changedAboveHead = 0;
    for (let y = 0; y < 360; y++) for (let x = 0; x < 480; x++) {
      const offset = (y * 480 + x) * 4;
      if (a[offset] !== b[offset] || a[offset + 1] !== b[offset + 1] || a[offset + 2] !== b[offset + 2]) {
        visibleChangedPixels++;
        if (x >= pupil.x - 18 && x <= pupil.x + 25 && y < pupil.y - 43) changedAboveHead++;
      }
    }
    assert.ok(changedAboveHead >= 4, `Raised hand has ${changedAboveHead} visible changed pixels above the pupil head (${visibleChangedPixels} visible changed pixels total)`);
    return { storyTime: 53, pupil: pupil.id, visibleChangedPixels, changedAboveHead, requirement: 'At least four actual rendered pixels above head',
      limitation: 'Mechanical visibility only; gesture/anatomy/art quality are reviewed by the independent critic.' };
  });
  await test('RENDER-03', 'Completed arithmetic renders the equals sign as two separate visible horizontal lines', () => {
    const completed = stateAt(48), blank = structuredClone(completed);
    const equalsSegments = completed.school.board.segments.filter(([a, b]) =>
      a[0] >= 242 && a[0] < 262 && b[0] >= 242 && b[0] < 262);
    assert.equal(equalsSegments.length, 2, 'The equals glyph must contain exactly two strokes');
    for (const [a, b] of equalsSegments) {
      assert.equal(a[1], b[1], 'Equals stroke must be horizontal');
      assert.ok(Math.abs(b[0] - a[0]) >= 4, 'Equals stroke must have a visible width');
    }
    const rows = [...new Set(equalsSegments.map(([a]) => Math.round(a[1])))].sort((a, b) => a - b);
    assert.equal(rows.length, 2, 'Both equals strokes collapsed onto the same row');
    assert.ok(rows[1] - rows[0] >= 2, 'Equals strokes are not visibly separated');
    blank.school.board.segments = [];
    const before = createCanvas(480, 360), after = createCanvas(480, 360);
    engine.renderFrame(before.getContext('2d'), blank, 'school', runtimeAssets);
    engine.renderFrame(after.getContext('2d'), completed, 'school', runtimeAssets);
    const a = before.getContext('2d').getImageData(0, 0, 480, 360).data;
    const b = after.getContext('2d').getImageData(0, 0, 480, 360).data;
    const visiblePixelsByRow = {};
    for (const y of rows) {
      visiblePixelsByRow[y] = 0;
      for (let x = 242; x < 262; x++) {
        const offset = (y * 480 + x) * 4;
        if ((a[offset] !== b[offset] || a[offset + 1] !== b[offset + 1] || a[offset + 2] !== b[offset + 2]) &&
          b[offset] === 228 && b[offset + 1] === 232 && b[offset + 2] === 208) visiblePixelsByRow[y]++;
      }
      assert.ok(visiblePixelsByRow[y] >= 4, `Equals row ${y} has only ${visiblePixelsByRow[y]} visible chalk pixels`);
    }
    return { storyTime: 48, equalsSegments, rows, visiblePixelsByRow,
      source: 'Actual completed board segments plus final rendered pixel difference, after character/occluder drawing' };
  });

  await test('RENDER-04', 'Notebook and correction strokes contribute visible pixels after tabletop occlusion', () => {
    function pixels(s) {
      const canvas = createCanvas(480, 360), ctx = canvas.getContext('2d');
      engine.renderFrame(ctx, s, 'school', runtimeAssets);
      return ctx.getImageData(0, 0, 480, 360).data;
    }
    function difference(a, b, notebook) {
      let count = 0;
      for (let y = Math.floor(notebook.y - 8); y <= notebook.y + 8; y++) {
        for (let x = Math.floor(notebook.x - 15); x <= notebook.x + 15; x++) {
          const offset = (y * 480 + x) * 4;
          if (a[offset] !== b[offset] || a[offset + 1] !== b[offset + 1] || a[offset + 2] !== b[offset + 2]) count++;
        }
      }
      return count;
    }
    const helping = stateAt(71), absent = structuredClone(helping);
    absent.school.notebook.x = -1000; absent.school.notebook.y = -1000;
    const notebookPixels = difference(pixels(helping), pixels(absent), helping.school.notebook);
    assert.ok(notebookPixels >= 20, `Notebook contributes only ${notebookPixels} visible pixels after furniture`);
    const corrected = stateAt(78), uncorrected = structuredClone(corrected);
    assert.ok(corrected.school.notebook.progress > 0, 'No notebook correction by end of help');
    uncorrected.school.notebook.progress = 0;
    const correctionPixels = difference(pixels(corrected), pixels(uncorrected), corrected.school.notebook);
    assert.ok(correctionPixels >= 3, `Correction contributes only ${correctionPixels} visible pixels`);
    assert.ok(distance(authoredHand(helping.school.actor), helping.school.notebook) <= 4, 'Pointing hand does not reach visible notebook');
    return { notebookTime: 71, correctionTime: 78, notebookPixels, correctionPixels,
      source: 'Actual final-layer renderer counterfactual pixel differences in notebook region' };
  });

  async function makeClockGame(storage = undefined, eventCheck = () => {}) {
    let now = 0, nextId = 1;
    const events = [], callbacks = new Map(), updates = [];
    const memory = new Map();
    storage ??= { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
    const clock = { now: () => now, requestFrame: cb => { const id = nextId++; callbacks.set(id, cb); return id; }, cancelFrame: id => callbacks.delete(id) };
    const game = await engine.createGame({ storeCanvas: createCanvas(480, 360), schoolCanvas: createCanvas(480, 360),
      assets: runtimeAssets, clock, storage, listenVisibility: false, interactive: false,
      onEvent: event => { events.push(event); eventCheck(event); }, onUpdate: update => updates.push(update) });
    return { game, events, updates, memory, callbacks, step(ms = 1000 / 60) { now += ms; return game.tick(now); } };
  }
  await test('CLOCK-01', 'Pause freezes story time and resume cannot consume the paused wall-clock gap', async () => {
    const h = await makeClockGame();
    try {
      h.game.start();
      for (let i = 0; i < 60; i++) h.step();
      const before = h.game.getSnapshot();
      assert.ok(Math.abs(before.elapsed - 1) < 1e-7);
      h.game.pause();
      for (let i = 0; i < 60; i++) h.step(1000);
      assert.equal(h.game.getSnapshot().elapsed, before.elapsed);
      assert.equal(h.game.getSnapshot().phase, 'paused');
      h.game.resume(); const after = h.step();
      assert.ok(after.elapsed - before.elapsed > 0 && after.elapsed - before.elapsed < .02);
      return { beforePause: before.elapsed, pausedWallClockSeconds: 60, afterResume: after.elapsed };
    } finally { h.game.destroy(); }
  });
  await test('CLOCK-02', 'Supported playback speeds change wall-clock rate while stalls remain bounded', async () => {
    const samples = [];
    for (const speed of [1, 1.5, 2]) {
      const h = await makeClockGame();
      try {
        h.game.start(); h.game.setSpeed(speed);
        for (let i = 0; i < 60; i++) h.step();
        assert.ok(Math.abs(h.game.getSnapshot().elapsed - speed) < 1e-7);
        const before = h.game.getSnapshot().elapsed, after = h.step(300000).elapsed;
        assert.ok(after - before <= .1000001, 'A simulated long tab gap skipped an interaction');
        h.game.setSpeed(Infinity); assert.equal(h.game.getSnapshot().speed, 1);
        samples.push({ speed, elapsedAfterOneWallClockSecond: before, elapsedAfterFiveMinuteGap: after });
      } finally { h.game.destroy(); }
    }
    return { samples, realBrowserTab: 'NOT_CHECKED; injected tick gap only' };
  });
  await test('CLOCK-03', 'Repeated player advance is continuous, visits every owner, and emits cues once', async () => {
    const h = await makeClockGame();
    try {
      h.game.start();
      const owners = ['crate']; let prior = 0, frames = 0, maxStep = 0;
      while (h.game.getSnapshot().phase !== 'complete' && frames < 5000) {
        const beforeAdvance = h.game.getSnapshot().elapsed;
        if (!h.game.getSnapshot().advancing) h.game.fastForward();
        assert.equal(h.game.getSnapshot().elapsed, beforeAdvance, 'Advance instantly teleported the world');
        const s = h.step(); frames++;
        const delta = s.elapsed - prior; maxStep = Math.max(maxStep, delta);
        assert.ok(delta >= 0 && delta <= .1000001, `Advance skipped ${delta} seconds`);
        if (s.store.bread.owner !== owners.at(-1)) owners.push(s.store.bread.owner);
        prior = s.elapsed;
      }
      const end = h.game.getSnapshot();
      assert.equal(end.phase, 'complete'); assert.equal(end.elapsed, 189);
      assert.deepEqual(owners, contract.trackedBread.ownerSequence);
      assert.deepEqual(end.dialogue.map(({ id, speaker, text }) => ({ id, speaker, text })), contract.dialogue);
      const cueIds = h.events.filter(e => e.type === 'cue').map(e => e.id);
      assert.equal(new Set(cueIds).size, cueIds.length, 'Cue replayed during advance');
      assert.deepEqual(cueIds, model.CUES.map(c => c.id));
      assert.equal(h.events.filter(e => e.type === 'cue' && e.id === 'break').length, 1);
      assert.equal(h.events.filter(e => e.type === 'complete').length, 1);
      assert.equal(h.memory.has(model.SAVE_KEY), false, 'Completed fragment kept a resumable half-save');
      return { renderedTicks: frames, maximumStoryStep: maxStep, owners, cueIds, completeEvents: 1 };
    } finally { h.game.destroy(); }
  });
  await test('CLOCK-04', 'Resume restores a mid-action save and reduced motion preserves physical and message state', async () => {
    const record = model.makeSave(109.2, { speed: 2, muted: false, reducedMotion: true });
    const storage = { getItem: () => JSON.stringify(record), setItem: () => {}, removeItem: () => {} };
    const h = await makeClockGame(storage);
    try {
      assert.equal(h.game.getSnapshot().phase, 'ready');
      assert.equal(h.game.getSnapshot().hasSave, true);
      h.game.start({ resume: true });
      assert.equal(h.game.getSnapshot().elapsed, 109.2);
      assert.equal(h.game.getSnapshot().store.bread.owner, 'hand');
      assert.equal(h.game.getSnapshot().speed, 2);
      h.game.pause();
      const baseline = h.game.getSnapshot();
      h.game.setReducedMotion(false); const changed = h.game.getSnapshot();
      assert.deepEqual(changed.store.bread, baseline.store.bread);
      assert.deepEqual(changed.school.board, baseline.school.board);
      assert.deepEqual(changed.dialogue, baseline.dialogue);
      h.game.restart(); assert.equal(h.game.getSnapshot().elapsed, 0);
      assert.equal(h.game.getSnapshot().store.bread.owner, 'crate');
      return { resumedAt: 109.2, resumedOwner: 'hand', reducedMotionWorldStateUnchanged: true, restartedAt: 0 };
    } finally { h.game.destroy(); }
  });
  await test('CLOCK-05', 'Quota failures produce one notice and gameplay keeps running', async () => {
    const h = await makeClockGame({ getItem: () => null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} });
    try {
      h.game.start();
      for (let i = 0; i < 240; i++) h.step();
      assert.ok(h.game.getSnapshot().elapsed > 3.9);
      assert.equal(h.events.filter(e => e.type === 'notice').length, 1);
      return { renderedTicks: 240, storyElapsed: h.game.getSnapshot().elapsed, notices: 1 };
    } finally { h.game.destroy(); }
  });
  await test('CLOCK-SAVE-01', 'Every irreversible message/cue/scene/prop boundary commits before a fresh game resumes', async () => {
    const cases = [
      { id: 'bread-grab', at: 25 }, { id: 'bread-packed', at: 28 }, { id: 'bread-staged', at: 32 }, { id: 'arithmetic-complete', at: 46.2 },
      { id: 'stage-pickup', at: 82 }, { id: 'trolley-release', at: 91 }, { id: 'scene-S03', at: 102 },
      { id: 'trolley-pickup', at: 105 }, { id: 'shelf-release', at: 120 }, { id: 'break-bell', at: 124 },
      { id: 'teacher-phone-out', at: 130.85 }, { id: 'first-message', at: 136 }, { id: 'vova-phone-out', at: 147 },
      { id: 'hello-message', at: 152 }, { id: 'bread-message', at: 159 }, { id: 'vova-phone-return', at: 164 },
      { id: 'bread-reply-1', at: 170 }, { id: 'bread-reply-2', at: 176 }, { id: 'teacher-phone-return', at: 178.66 }
    ];
    const outcomes = [], violations = [], cueCommitChecks = [];
    for (const c of cases) {
      if (c.id.includes('phone-')) {
        const side = c.id.startsWith('vova') ? 'store' : 'school';
        assert.notEqual(stateAt(c.at - 1 / 60)[side].phone.owner, stateAt(c.at)[side].phone.owner,
          `${c.id}: test timestamp is not the actual phone ownership boundary`);
      }
      const memory = new Map([[model.SAVE_KEY, JSON.stringify(model.makeSave(c.at - .5))]]);
      const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
      const h = await makeClockGame(storage, event => {
        if (event.type !== 'cue') return;
        const saved = model.loadSave(storage);
        cueCommitChecks.push({ boundary: c.id, cue: event.id, at: event.at, savedBeforeCallback: saved?.elapsed });
        if (!saved || saved.elapsed < event.at) violations.push(`${c.id}: cue callback ${event.id} ran before storage committed its boundary`);
      }); let reloaded;
      try {
        h.game.start({ resume: true });
        for (let i = 0; i < 43; i++) h.step();
        const visible = h.game.getSnapshot(), saved = model.loadSave(storage);
        reloaded = await makeClockGame(storage); reloaded.game.start({ resume: true });
        const restored = reloaded.game.getSnapshot();
        const outcome = { id: c.id, boundary: c.at, visibleAt: visible.elapsed, savedAt: saved?.elapsed,
          restoredAt: restored.elapsed, visibleOwner: visible.store.bread.owner, restoredOwner: restored.store.bread.owner,
          visibleMessages: visible.dialogue.map(m => m.id), restoredMessages: restored.dialogue.map(m => m.id),
          visiblePhone: [visible.store.phone.visible, visible.school.phone.visible],
          restoredPhone: [restored.store.phone.visible, restored.school.phone.visible],
          visibleBoardComplete: visible.school.board.complete, restoredBoardComplete: restored.school.board.complete };
        outcomes.push(outcome);
        if (!saved || saved.elapsed < c.at) violations.push(`${c.id}: visible at ${visible.elapsed.toFixed(3)}, save is ${saved?.elapsed}`);
        if (visible.store.bread.owner !== restored.store.bread.owner || visible.store.bread.packaged !== restored.store.bread.packaged)
          violations.push(`${c.id}: restored bread differs from the committed physical result`);
        if (JSON.stringify(outcome.visibleMessages) !== JSON.stringify(outcome.restoredMessages)) violations.push(`${c.id}: a visible message disappeared after resume`);
        if (JSON.stringify(outcome.visiblePhone) !== JSON.stringify(outcome.restoredPhone)) violations.push(`${c.id}: a phone ownership result disappeared after resume`);
        if (outcome.visibleBoardComplete !== outcome.restoredBoardComplete) violations.push(`${c.id}: completed arithmetic disappeared after resume`);
        const emitted = h.events.filter(e => e.type === 'cue').map(e => e.id);
        for (let i = 0; i < 30; i++) reloaded.step();
        const replayed = reloaded.events.filter(e => e.type === 'cue' && emitted.includes(e.id)).map(e => e.id);
        if (replayed.length) violations.push(`${c.id}: cues replayed after resume: ${replayed.join(', ')}`);
      } finally { h.game.destroy(); reloaded?.game.destroy(); }
    }
    if (violations.length) { const error = new Error(violations.join('; ')); error.evidence = { outcomes, cueCommitChecks, violations }; throw error; }
    return { boundariesChecked: cases.length, outcomes, cueCommitChecks, reloadType: 'New createGame with same injected storage; not a browser page reload' };
  });
}

await test('SOURCE-01', 'Regression evidence still matches every model/renderer/manifest file loaded by this run', () => {
  for (const [file, hash] of Object.entries(report.sourceSha256)) assert.equal(digest(file), hash, `${file} changed during QA; rerun required`);
  for (const [file, meta] of Object.entries(report.assetSha256 ?? {})) assert.equal(digest(`dist/${file}`), meta.sha256,
    `${file} changed during QA; rerun required`);
  return { checkedSourceFiles: Object.keys(report.sourceSha256), checkedAssetFiles: Object.keys(report.assetSha256 ?? {}), stale: false };
});
writeReport();
