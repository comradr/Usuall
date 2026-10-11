import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { projectRoot, sha256 } from './native-harness.mjs';

const regressionFile = 'production/qa-regression.json';
const captureFile = 'production/qa-captures/index.json';
const regression = JSON.parse(fs.readFileSync(path.join(projectRoot, regressionFile), 'utf8'));
const capture = JSON.parse(fs.readFileSync(path.join(projectRoot, captureFile), 'utf8'));
const findings = [];
for (const [file, digest] of Object.entries(regression.sourceSha256)) {
  if (sha256(fs.readFileSync(path.join(projectRoot, file))) !== digest) findings.push(`${file} no longer matches the tested source`);
}
for (const [file, digest] of Object.entries(capture.sourceSha256)) {
  if (sha256(fs.readFileSync(path.join(projectRoot, file))) !== digest) findings.push(`${file} no longer matches captured frames`);
  if (regression.sourceSha256[file] !== digest) findings.push(`${file} differs between regression and frame capture`);
}
for (const [file, meta] of Object.entries(capture.imageFiles)) {
  if (sha256(fs.readFileSync(path.join(projectRoot, 'dist', file))) !== meta.sha256) findings.push(`${file} changed after offscreen capture`);
  if (regression.assetSha256[file]?.sha256 !== meta.sha256) findings.push(`${file} differs between tested assets and offscreen capture`);
}
for (const item of [capture.gif, capture.poster, ...capture.contactSheets, ...capture.poseSheets,
  ...capture.originalRateClips.map(clip => clip.gif)]) {
  if (sha256(fs.readFileSync(path.join(projectRoot, item.file))) !== item.sha256) findings.push(`${item.file} differs from recorded evidence`);
}
const complete = regression.status === 'PASS' && capture.status === 'CAPTURED_NOT_BROWSER' && findings.length === 0;
const report = {
  title: 'Обычный день · S02–S03 · technical native QA',
  reviewer: { kind: 'producer_native_checks', independent: false, context_id: '/root' },
  createdAt: new Date().toISOString(),
  scope: ['S02', 'S03'], storyDurationSeconds: 189,
  status: complete ? 'NATIVE_CHECKS_PASS_BROWSER_NOT_CHECKED' : 'NATIVE_QA_BLOCKED',
  commands: [
    { command: regression.command, environment: regression.environment, exitCode: regression.status === 'PASS' ? 0 : 1 },
    { command: capture.command, environment: 'Native Canvas plus Pillow export; no browser', exitCode: 0,
      childCommand: 'python tests/build-offscreen-review.py production/qa-captures' },
    { command: 'node tests/qa-report.mjs', environment: 'Evidence/source SHA-256 crosscheck', exitCode: complete ? 0 : 1 }
  ],
  regression: { file: regressionFile, sha256: sha256(fs.readFileSync(path.join(projectRoot, regressionFile))), status: regression.status, counts: regression.counts,
    checks: regression.tests.map(t => ({ id: t.id, purpose: t.purpose, status: t.status })) },
  offscreen: { file: captureFile, sha256: sha256(fs.readFileSync(path.join(projectRoot, captureFile))), status: capture.status,
    renderer: capture.renderer, nativeSizePerWorld: capture.nativeSizePerWorld, rawFrameCount: capture.raw.length,
    runtimePoseFrameCount: capture.runtimePoseFrameCount, forcedAuthoredFrameCount: capture.stagedPoses.length,
    contactCases: capture.contactCases.length, mobileWorldCopies: capture.mobileWorld.length,
    gif: capture.gif, poster: capture.poster, contactSheets: capture.contactSheets, poseSheets: capture.poseSheets,
    originalRateClips: capture.originalRateClips.map(({ id, from, to, rate, type, frames, gif }) =>
      ({ id, from, to, rate, type, frameCount: frames.length, gif })),
    distinction: 'Staged forced authored frames are labeled separately from actual timeline states. GIF is an accelerated chronological montage.' },
  sourceSha256: capture.sourceSha256,
  browser: { status: 'NOT_CHECKED', reason: 'Managed Sites browser skill unavailable; no server/browser/Playwright workaround was used.' },
  mobileDomTouchPip: { status: 'NOT_CHECKED', reason: '320 px evidence is native world-only nearest-neighbor scaling, not a device/HTML/PIP/touch test.' },
  audioListening: { status: 'NOT_CHECKED', reason: 'Cue ordering tested in injected clock. No actual browser/audio listening.' },
  performance: { status: 'NOT_CHECKED', reason: 'Native export timing does not measure browser FPS or device performance.' },
  artisticQuality: { status: 'NOT_CERTIFIED_BY_QA', reason: 'Requires separate independent critic and user creative approval.' },
  completeGame: { status: 'NOT_IMPLEMENTED_IN_THIS_MILESTONE', scenes: ['S01', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11'] },
  findings
};
fs.writeFileSync(path.join(projectRoot, 'production/qa-report.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# QA · Обычный день · S02–S03', '',
  `**${report.status}**. Scope: two scenes, 189 seconds.`, '',
  `Deterministic regression: **${regression.counts.pass} PASS / ${regression.counts.fail} FAIL**.`, '',
  'Checked the actual model and production renderer with measured exported PNG sockets, native Canvas, injected clock and simulated storage. '
    + 'The default production loader was also exercised through createGame without injected assets; filesystem-backed fetch/image substitutes verified every resolved asset path.', '',
  'Evidence separates every forced authored pose/frame audit from timeline replay. The chronology montage is accelerated, omits quiet gaps and has no audio. '
    + 'Four additional native offscreen clips play the actual walk, chalk and teacher phone windows at the original story rate; these also have no audio.', '',
  `Captured ${capture.raw.length} timeline PNG/state records, ${capture.stagedPoses.length} forced authored frames and ${capture.contactCases.length} contact neighborhoods. `
    + `GIF: ${capture.gif.displaySeconds} seconds, ${capture.gif.decodedFrames} decoded frames, ${capture.gif.distinctDecodedFrames} distinct frames.`, '',
  '| Check | Outcome |', '|---|---|',
  ...regression.tests.map(t => `| ${t.id}: ${t.purpose} | ${t.status} |`), '',
  '## NOT_CHECKED', '',
  '- Real browser launch, HTML/CSS layout, mobile DOM, PIP and touch input.',
  '- Browser audio output/listening, autoplay policy and browser/device performance.',
  '- Whole game outside S02–S03. Artistic quality is not certified by these tests.', '',
  'The 320 px PNGs show only nearest-neighbor scaled world rendering. They do not prove responsive UI.', '',
  '## Commands actually used', '',
  ...report.commands.map(c => `- \`${c.command}\` — exit ${c.exitCode}, ${c.environment}.`), '',
  '## Evidence integrity', '',
  findings.length ? findings.map(f => `- ${f}`).join('\n') : 'Regression, source, atlas and captured evidence SHA-256 agree at report creation.', '',
  'Exact hashes, file paths, assertions and capture parameters are in `qa-report.json`, `qa-regression.json` and `qa-captures/index.json`.', ''
];
fs.writeFileSync(path.join(projectRoot, 'production/qa-report.md'), lines.join('\n'));
process.stdout.write(JSON.stringify({ status: report.status, counts: regression.counts, rawFrames: capture.raw.length, gif: capture.gif.file, findings }, null, 2) + '\n');
assert.ok(complete, 'Native evidence is incomplete, failing or stale. See production/qa-report.json.');
