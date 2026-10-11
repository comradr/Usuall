import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.isFile() ? [target] : [];
  });
}
const files = [...walk(path.join(root, 'dist')), path.join(root, 'src/story.json')]
  .sort().map(file => {
    const bytes = fs.readFileSync(file);
    return { path: path.relative(root, file), bytes: bytes.length, sha256: hash(bytes) };
  });
const content = { format: 'obychnyy-den-build-v1', files };
const manifest = { ...content, build_id: `slice-${hash(JSON.stringify(content)).slice(0, 20)}` };
fs.writeFileSync(path.join(root, 'production/build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.build_id}: ${files.length} files; ${files.reduce((sum, file) => sum + file.bytes, 0)} bytes`);
