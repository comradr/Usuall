import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadNativeFiles,createCanvas,projectRoot,sha256} from '../tests/native-harness.mjs';
import {stateAt} from '../dist/model.js';
import {buildGeometry,renderFrame} from '../dist/engine.js';
const loaded=await loadNativeFiles(),assets={manifest:loaded.manifest,images:loaded.imagesByFile};
const geometry=buildGeometry(loaded.manifest),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'usuall-native-preview-'));
const windows=[[10,11.6],[34.7,36.3],[40,41.6],[46.1,48.2],[130.4,131.8],[152,153.6],[182,183.6]],frames=[];
function render(t){const c=createCanvas(960,360),x=c.getContext('2d'),s=stateAt(t,{geometry});for(const [i,side]of ['store','school'].entries()){const p=createCanvas(480,360);renderFrame(p.getContext('2d'),s,side,assets,{ambientTime:t,reducedMotion:true});x.drawImage(p,i*480,0);}return c.toBuffer('image/png');}
try{
  fs.writeFileSync(path.join(projectRoot,'dist/assets/fragment-poster.png'),render(41));
  for(const [start,end]of windows)for(let i=0;start+i/10<end-1e-8;i++){
    const t=start+i/10,b=render(t);fs.writeFileSync(path.join(temporary,String(frames.length).padStart(3,'0')+'.png'),b);frames.push({t,sha256:sha256(b)});
  }
  const py=`from PIL import Image\nfrom pathlib import Path\nimport sys\nfiles=sorted(Path(sys.argv[1]).glob('*.png'))\nimages=[Image.open(f).convert('RGB') for f in files]\npalette=images[0].quantize(colors=192)\nframes=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in images]\nframes[0].save(sys.argv[2],save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=False,disposal=1)\n`;
  const result=spawnSync('python3',['-c',py,temporary,path.join(projectRoot,'dist/assets/fragment-preview.gif')],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);
  const report={type:'Actual native Canvas montage,1x inside each window,10fps; not browser or interaction proof',windows,frames,sourceHashes:Object.fromEntries(['dist/model.js','dist/engine.js','dist/assets/manifest.json'].map(f=>[f,sha256(fs.readFileSync(path.join(projectRoot,f)))])),assetHashes:loaded.files,output:'dist/assets/fragment-preview.gif',poster:'dist/assets/fragment-poster.png'};
  fs.writeFileSync(path.join(projectRoot,'production/native-preview-recovery.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Native current preview rebuilt:'+frames.length+'frames.');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
