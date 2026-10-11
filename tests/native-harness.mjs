import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// Installed native Canvas only. This harness never imports a browser driver,
// starts a server, navigates a browser or fabricates DOM/layout evidence.
let canvasPackage;
try { canvasPackage = require.resolve('@napi-rs/canvas'); }
catch { canvasPackage = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas')
  : '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'; }
export const nativeCanvas = require(canvasPackage);
export const { createCanvas, loadImage } = nativeCanvas;
export const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

export function manifestImageFiles(manifest) {
  const files = [];
  function visit(value) {
    if (typeof value === 'string' && /\.(png|webp|jpe?g)$/i.test(value)) files.push(value);
    else if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child);
  }
  visit(manifest);
  return [...new Set(files)];
}

export async function loadNativeFiles() {
  const manifestPath = path.join(projectRoot, 'dist/assets/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const imagesByFile = {}, files = {};
  for (const filename of manifestImageFiles(manifest)) {
    const absolute = path.join(projectRoot, 'dist', filename);
    const bytes = fs.readFileSync(absolute);
    imagesByFile[filename] = await loadImage(bytes);
    files[filename] = { sha256: sha256(bytes), bytes: bytes.length };
  }
  return { manifest, imagesByFile, files, manifestSha256: sha256(fs.readFileSync(manifestPath)) };
}

export function cropAtlasFrame(image, actorSpec, frame) {
  const { frameWidth: w, frameHeight: h, columns } = actorSpec;
  const out = createCanvas(w, h), ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, (frame % columns) * w, Math.floor(frame / columns) * h, w, h, 0, 0, w, h);
  return out;
}

export function pixelStats(canvas) {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let opaque = 0, transparent = 0, partial = 0;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const alpha = data[(y * canvas.width + x) * 4 + 3];
    if (alpha === 0) transparent++;
    else {
      if (alpha === 255) opaque++; else partial++;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { width: canvas.width, height: canvas.height, opaque, transparent, partial,
    bounds: maxX < 0 ? null : [minX, minY, maxX + 1, maxY + 1], rgbaSha256: sha256(Buffer.from(data)) };
}

export function socketPixelDistance(canvas, socket) {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let nearest = Infinity;
  const [sx, sy] = socket;
  for (let y = Math.max(0, Math.floor(sy) - 6); y <= Math.min(canvas.height - 1, Math.ceil(sy) + 6); y++) {
    for (let x = Math.max(0, Math.floor(sx) - 6); x <= Math.min(canvas.width - 1, Math.ceil(sx) + 6); x++) {
      if (data[(y * canvas.width + x) * 4 + 3]) nearest = Math.min(nearest, Math.hypot(x - sx, y - sy));
    }
  }
  return nearest;
}
