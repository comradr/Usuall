// Reproduce only the engine-owned part of the static build. Art, UI and canon have separate owners.
import {copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
await mkdir(new URL('dist/',root),{recursive:true});
await copyFile(new URL('src/build-engine-model.js',root),new URL('dist/model.js',root));
await copyFile(new URL('src/build-engine-runtime.js',root),new URL('dist/engine.js',root));
console.log('Engine and canonical timeline rebuilt.');
