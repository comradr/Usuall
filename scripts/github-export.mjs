import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=(alg,b)=>createHash(alg).update(b).digest('hex');
function entries(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?entries(`${dir}/${e.name}`):e.isFile()?[`${dir}/${e.name}`]:[]);}
const dirs=['dist','src','scripts','tests','production/art-source','production/critic-interactive-captures','production/critic-interactive-baseline'];
const extra=['README.md','package.json','.openai/hosting.json','production/npc-review-sheet.png','production/critic-interactive-probe.mjs'];
const docs=entries('production').filter(p=>p.split('/').length===2&&/\.(json|md|txt|csv)$/.test(p));
const files=[...dirs.flatMap(entries),...extra,...docs].filter(p=>!/(?:-rejected|__pycache__|\.pyc$|\.tmp$)/.test(p)).sort();
const unique=[...new Set(files)];
function meta(p,b){return {path:p,bytes:b.length,encoding:/\.(png|gif|jpe?g|webp)$/i.test(p)?'base64':'utf-8',sha256:hash('sha256',b),git_sha:hash('sha1',Buffer.concat([Buffer.from(`blob ${b.length}\0`),b]))};}
if(process.argv[2]==='--file'||process.argv[2]==='--chunk'){
 const p=process.argv[3];if(!unique.includes(p))throw Error('Not in export');
 const b=fs.readFileSync(path.join(root,p));const m=meta(p,b);
 if(process.argv[2]==='--chunk'){const start=Number(process.argv[4]),size=Number(process.argv[5]); if(start%3||size%3||size>98304)throw Error('Invalid chunk');m.content=b.subarray(start,start+size).toString('base64');m.offset=start;}
 else m.content=b.toString(m.encoding==='base64'?'base64':'utf8');
 process.stdout.write(JSON.stringify(m));
}else process.stdout.write(JSON.stringify({files:unique.map(p=>{const b=fs.readFileSync(path.join(root,p));return meta(p,b);})}));
