import {WIDTH,HEIGHT,TOTAL_DURATION,SAVE_KEY,SCENES,CUES,MESSAGES,NASTYA_PHONE_ACTIONS,stateAt,nextBeatEnd,makeSave,loadSave,saveToStorage,clearSave} from './model.js';

/** Images are original scene layers and alpha atlases, never a screenshot of a finished scene. */
export async function loadAssets(manifestURL = new URL('./assets/manifest.json', import.meta.url), imageLoader) {
  const response = await fetch(manifestURL);
  if(!response.ok)throw new Error('Не удалось загрузить изображения игры.');
  const manifest=await response.json();
  const paths=new Set();
  const collect=value=>{
    if(typeof value==='string'&&/\.(?:png|webp|jpg|jpeg)$/i.test(value))paths.add(value);
    else if(value&&typeof value==='object')Object.values(value).forEach(collect);
  };
  collect(manifest);
  const images={};
  const load=imageLoader||((url)=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Не удалось загрузить изображение игры.'));im.src=url;
  }));
  await Promise.all([...paths].map(async path=>{
    const url=new URL(path,path.startsWith('assets/')?new URL('../',manifestURL):manifestURL);images[path]=await load(url.href);
  }));
  return {manifest,images};
}
const fileOf = value => typeof value==='string'?value:value?.file||value?.image||value?.src||value?.atlas;
const imageOf=(assets,value)=>{
  const key=fileOf(value);return assets.images instanceof Map?assets.images.get(key):assets.images?.[key];
};
/** Explicit adapter for the art team's measured native hand sockets and nested anchors. */
export function buildGeometry(manifest) {
  const geometry=JSON.parse(JSON.stringify(manifest));
  const va=geometry.actors.vova,na=geometry.actors.nastya,vs=manifest.anchors.store,ns=manifest.anchors.school;
  va.poses={...va.poses,carryWalk:va.poses.carryWalk||va.poses.walk,busy:va.poses.busy||[...va.poses.pack,...va.poses.idle,...va.poses.pack],cart:va.poses.cartGrab||va.poses.cart||va.poses.pack,
    put:va.poses.shelfPut||va.poses.raisedContact||va.poses.put,
    liftRaw:va.poses.liftRaw||[...va.poses.pack,...(va.poses.liftA||[]),...(va.poses.carryB||[]),...va.poses.carry],
    lowerPack:va.poses.lowerPack||[...va.poses.carry,...(va.poses.carryB||[]),...(va.poses.liftA||[]),...(va.poses.packA||[]),...va.poses.pack],
    liftStage:va.poses.liftStage||[...va.poses.pack,...va.poses.carry],
    lowerCart:va.poses.lowerCart||[...va.poses.carry,...(va.poses.carryB||[]),...(va.poses.cartLiftB||[]),...(va.poses.cartLiftA||[]),...(va.poses.cartGrab||va.poses.pack)],
    liftCart:va.poses.cartLift||[...(va.poses.cart||va.poses.pack),...va.poses.carry],
    lowerShelf:va.poses.shelfLift||[...va.poses.carry,...(va.poses.shelfPut||va.poses.raisedContact||va.poses.put)],
    phoneReach:[...va.poses.idle,...va.poses.carry,...(va.poses.shelfLift?[11]:va.poses.carry)],
    phoneReturn:va.poses.phoneReturn||[...va.poses.phone,...va.poses.carry,...va.poses.idle]};
  na.poses={...na.poses,...NASTYA_PHONE_ACTIONS, chalkStep:na.poses.chalkStep||na.poses.chalkPenUp||na.poses.chalkMiddle};
  function offset(id,pose,last=false) {const m=geometry.actors[id],frames=m.poses[pose],idx=last?frames.at(-1):frames[0];const s=m.frames[idx]?.hand||m.sockets[String(idx)]?.hand;if(!s)throw new Error('Не описана точка захвата спрайта.');return [s[0]-m.pivot[0],s[1]-m.pivot[1]];}
  function feet(target,id,pose,last=false){const s=offset(id,pose,last);return [target[0]-s[0],target[1]-s[1]];}
  geometry.anchors={source:vs.source,stage:vs.pack,trolley:vs.trolley,shelf:vs.shelf,
    sourceFeet:feet(vs.source,'vova','reach',true),workFeet:feet(vs.pack,'vova','pack',true),
    cartFeet:feet(vs.trolley,'vova','cart',true),shelfFeet:feet(vs.shelf,'vova','put',true),
    teacherInitial:ns.initial,boardFeet:ns.boardFeet,
    chalkFootBase:197-offset('nastya','chalkHigh')[0],
    helpFeet:feet(ns.studentNotebook,'nastya','help',true),notebook:ns.studentNotebook,
    teacherPhoneFeet:ns.breakFeet};
  geometry.collisions=Object.fromEntries(Object.entries(manifest.obstacles).map(([side,rects])=>[side,rects.map(([x,y,width,height])=>({x,y,width,height}))]));
  return geometry;
}
function imageRect(ctx,img,rect,x,y,w,h) {ctx.drawImage(img,rect[0],rect[1],rect[2],rect[3],Math.round(x),Math.round(y),w,h);}

function spriteSpec(person,assets) {
  const m=assets.manifest.actors?.[person.id];
  if(!m)throw new Error('Спрайты персонажа ещё не готовы.');
  const im=imageOf(assets,m);
  if(!im)throw new Error('Не удалось загрузить спрайты персонажа.');
  const fw=m.frameWidth||m.cell?.[0]||96,fh=m.frameHeight||m.cell?.[1]||112;
  const record=m.frames?.[person.frame],columns=m.columns||Math.floor(im.width/fw);
  const rect=record?.rect||[person.frame%columns*fw,Math.floor(person.frame/columns)*fh,fw,fh];
  return {im,rect,pivot:record?.pivot||m.pivot||[48,100]};
}
function drawActor(ctx,person,assets) {
  const {im,rect,pivot}=spriteSpec(person,assets);
  const mirror=person.facing==='right';
  ctx.save();ctx.translate(Math.round(person.x),Math.round(person.y));
  if(mirror)ctx.scale(-1,1);
  imageRect(ctx,im,rect,-pivot[0],-pivot[1],rect[2],rect[3]);ctx.restore();
}
/** Pixel lines use whole native pixels, including the literal six arithmetic glyphs. */
export function pixelLine(ctx,x1,y1,x2,y2,colour,width=1) {
  let x=Math.round(x1),y=Math.round(y1),endX=Math.round(x2),endY=Math.round(y2);
  const dx=Math.abs(endX-x),sx=x<endX?1:-1,dy=-Math.abs(endY-y),sy=y<endY?1:-1;
  let err=dx+dy;ctx.fillStyle=colour;
  for(let guard=0;guard<1024;guard++) {ctx.fillRect(x,y,width,width);if(x===endX&&y===endY)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
}
function drawChalk(ctx,board) {
  for(const [a,b]of board.segments)pixelLine(ctx,a[0],a[1],b[0],b[1],'#e4e8d0',1);
}
function drawLoaf(ctx,bread,assets) {
  const meta=assets.manifest.props?.[bread.packaged?'breadPacked':'breadRaw']||(!bread.packaged?assets.manifest.props?.bread:null);
  const im=imageOf(assets,meta);
  if(im) {const rect=meta.rect||[0,0,im.width,im.height],pivot=meta.pivot||[rect[2]/2,rect[3]/2];imageRect(ctx,im,rect,bread.x-pivot[0],bread.y-pivot[1],rect[2],rect[3]);return;}
  // Small original code-native props. Only main people require the alpha atlases.
  const x=Math.round(bread.x)-9,y=Math.round(bread.y)-5;
  ctx.fillStyle='#7f5b3c';ctx.fillRect(x+2,y,14,1);ctx.fillRect(x,y+3,18,5);ctx.fillRect(x+1,y+1,16,7);
  ctx.fillStyle='#c59650';ctx.fillRect(x+2,y+2,14,5);ctx.fillStyle='#d9b77a';ctx.fillRect(x+3,y+1,11,3);
  ctx.fillStyle='#b6813f';ctx.fillRect(x+5,y+2,1,3);ctx.fillRect(x+10,y+2,1,3);ctx.fillStyle='#e6c48d';ctx.fillRect(x+3,y+2,2,1);
  if(bread.packaged) {
    ctx.fillStyle='#d8ded2';ctx.fillRect(x-1,y+2,1,5);ctx.fillRect(x+18,y+2,1,5);ctx.fillRect(x+1,y+8,17,1);
    ctx.fillStyle='#f0ead9';ctx.fillRect(x+1,y+1,2,1);ctx.fillRect(x+15,y+1,2,1);ctx.fillRect(x+5,y+7,5,1);
    ctx.fillStyle='#bfbba5';ctx.fillRect(x+18,y+4,3,2);ctx.fillRect(x+20,y+3,1,1);
  }
}
function drawBag(ctx,bag,assets) {
  if(!bag.visible)return;const meta=assets.manifest.props?.bagEmpty,im=imageOf(assets,meta);if(!im)return;
  const width=Math.round(8+16*bag.openness);imageRect(ctx,im,[0,0,im.width,im.height],bag.x-width/2,bag.y-12,width,24);
}
function drawPhone(ctx,phone,assets,actor) {
  if(!phone.visible)return;
  if(actor&&assets.manifest.actors[actor.id].sockets?.[String(actor.frame)]?.bakedItem==='phone')return;
  const meta=assets.manifest.props?.phone,im=imageOf(assets,meta);
  if(im) {const rect=meta.rect||[0,0,im.width,im.height],pivot=meta.pivot||[rect[2]/2,rect[3]/2];imageRect(ctx,im,rect,phone.x-pivot[0],phone.y-pivot[1],rect[2],rect[3]);return;}
  const x=Math.round(phone.x)-3,y=Math.round(phone.y)-5;
  ctx.fillStyle='#2b3031';ctx.fillRect(x,y,6,11);ctx.fillStyle='#cfdbc9';ctx.fillRect(x+1,y+1,4,8);
  ctx.fillStyle='#7faba0';ctx.fillRect(x+1,y+3,3,1);ctx.fillRect(x+2,y+5,3,1);ctx.fillStyle='#727c74';ctx.fillRect(x+2,y+9,2,1);
}
function drawTrolley(ctx,frontOnly=false) {
  if(!frontOnly) {
    pixelLine(ctx,155,274,164,274,'#757f78',2);pixelLine(ctx,164,274,171,319,'#7e8881',2);
    ctx.fillStyle='#66766d';ctx.fillRect(167,278,28,3);ctx.fillStyle='#b3b7a6';ctx.fillRect(169,284,28,2);
    ctx.fillStyle='#3c4b45';ctx.fillRect(172,322,5,5);ctx.fillRect(191,322,5,5);
    pixelLine(ctx,173,320,195,320,'#7d8b7b',2);
  } else {
    ctx.fillStyle='#879184';ctx.fillRect(168,294,29,2);ctx.fillRect(168,307,29,2);
    for(let x=168;x<198;x+=7)ctx.fillRect(x,285,1,24);
    pixelLine(ctx,168,282,168,310,'#738371',2);pixelLine(ctx,198,282,198,309,'#738371',2);
  }
}
function genericPerson(ctx,pupil,kind='pupil') {
  const x=Math.round(pupil.x),y=Math.round(pupil.y),height=58;
  const sway=pupil.walking||kind==='customer'?(pupil.frame%2?1:-1):0;
  const hair=kind==='customer'?'#66614f':['#6b5742','#584b3b','#755943','#534d46'][Number(pupil.id?.split('-')[1]||0)%4];
  ctx.fillStyle='#474840';ctx.fillRect(x-7,y-2,6,3);ctx.fillRect(x+3,y-2,6,3);
  ctx.fillStyle='#525851';ctx.fillRect(x-6,y-15+sway,5,13);ctx.fillRect(x+2,y-15-sway,5,13);
  ctx.fillStyle=pupil.colour||'#8b967d';ctx.fillRect(x-9,y-height+18,18,height-31);ctx.fillRect(x-12,y-height+21,4,12);
  ctx.fillStyle=hair;ctx.fillRect(x-8,y-height,16,17);ctx.fillRect(x-6,y-height-2,12,2);
  ctx.fillStyle='#ccaa7c';ctx.fillRect(x-7,y-height+6,14,11);ctx.fillStyle='#b98b6e';ctx.fillRect(x+6,y-height+9,2,5);
  ctx.fillStyle='#635a49';ctx.fillRect(x-4,y-height+9,2,1);ctx.fillRect(x+3,y-height+9,2,1);
  ctx.fillStyle='#c4a076';
  if(pupil.raised) {
    pixelLine(ctx,x+9,y-height+22,x+13,y-height+8,'#c4a076',3);
    pixelLine(ctx,x+13,y-height+8,x+10,y-height-8,'#c4a076',3);
    ctx.fillRect(x+9,y-height-11,5,5);
  }
  else {const armY=y-height+22+(pupil.writing?pupil.frame%2:0);ctx.fillRect(x+9,armY,7,3);}
}
function drawNotebook(ctx,school) {
  const {x,y,progress}=school.notebook;
  ctx.fillStyle='#cbbd8a';ctx.fillRect(x-12,y-5,24,10);ctx.fillStyle='#eee2b8';ctx.fillRect(x-11,y-4,10,8);ctx.fillRect(x+1,y-4,10,8);
  ctx.fillStyle='#8eaa93';ctx.fillRect(x-9,y-2,6,1);ctx.fillRect(x+3,y-2,6,1);
  if(progress>0)pixelLine(ctx,x+3,y+1,x+3+7*progress,y+1,'#837c65');
}
function drawDeskContact(ctx,school,assets) {
  // A depth split of the unchanged authored sprite puts its contacting forearm over the tabletop.
  // The legs retain their original furniture occlusion; no limb is moved or resized.
  const {x,y}=school.notebook;
  ctx.save();ctx.beginPath();ctx.rect(x-18,y-18,60,27);ctx.clip();drawActor(ctx,school.actor,assets);ctx.restore();
}
function drawSmallProp(ctx,assets,name,x,y) {
  const meta=assets.manifest.props?.[name],im=imageOf(assets,meta);if(!im)return false;
  const rect=meta.rect||[0,0,im.width,im.height],pivot=meta.pivot||[im.width/2,im.height/2];
  imageRect(ctx,im,rect,x-pivot[0],y-pivot[1],rect[2],rect[3]);return true;
}
function drawChair(ctx,chair,assets) {
  if(!chair.visible)return;
  const meta=assets.manifest.props?.chair,im=imageOf(assets,meta);if(!im)return;
  // One fixed chair: native seat y14 and floor y35 fit the authored hip 24 px above the floor.
  // Nearest-neighbour uniform prop scale is rounded to whole destination pixels.
  const height=Math.round((chair.y-chair.seat.y)*35/(35-14)),width=Math.round(25*height/35);
  const left=chair.seat.x-16*width/25,top=chair.y-height;
  imageRect(ctx,im,[0,0,im.width,im.height],left,top,width,height);
}
export function cameraAt(seconds,side,reducedMotion=false) {
  if(side!=='store'||reducedMotion||seconds<102||seconds>=111)return {zoom:1,x:170,y:260};
  const u=seconds-102,smooth=v=>v*v*(3-2*v),blend=u<1?smooth(u):u>8?smooth(9-u):1;
  return {zoom:1+.10*blend,x:170,y:260};
}
function drawAmbient(ctx,side,time,reducedMotion) {
  if(side==='store') {
    ctx.fillStyle='#83986e';ctx.fillRect(440,130,2,2);
    if(!reducedMotion) {ctx.fillStyle='#c6c7a7';const t=Math.floor(time*0.6)%3;ctx.fillRect(429+t,112,1,2);}
  } else if(!reducedMotion) {
    ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#eeead0';
    for(let i=0;i<5;i++) {const x=22+((i*17+time*(2+i*.25))%112),y=68+((i*11+time*(.8+i*.15))%64);ctx.fillRect(Math.floor(x),Math.floor(y),1,1);}
    ctx.restore();
  }
}
function drawOccluder(ctx,occluder,assets) {
  const im=imageOf(assets,occluder);
  if(im)ctx.drawImage(im,0,0,WIDTH,HEIGHT);
  else if(occluder.rect) {
    const bg=imageOf(assets,assets.manifest.backgrounds[occluder.side]);
    if(bg)imageRect(ctx,bg,occluder.rect,occluder.rect[0],occluder.rect[1],occluder.rect[2],occluder.rect[3]);
  }
}

/** Shared production renderer. Native QA injects the very same PNGs and Canvas 2D context. */
export function renderFrame(ctx,state,side,assets,options={}) {
  if(side!=='store'&&side!=='school')throw new Error('Unknown world');
  const background=imageOf(assets,assets.manifest.backgrounds?.[side]);
  if(!background)throw new Error('Фон игры ещё не готов.');
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,WIDTH,HEIGHT);
  const camera=cameraAt(state.elapsed,side,options.reducedMotion);ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  ctx.drawImage(background,0,0,WIDTH,HEIGHT);
  drawAmbient(ctx,side,options.ambientTime??state.elapsed,options.reducedMotion);
  const layers=[];
  if(side==='store') {
    const world=state.store;
    const trolleyImage=drawSmallProp(ctx,assets,'trolley',178,298);
    if(!trolleyImage)drawTrolley(ctx);
    // Five remaining loaves do not move. The sixth has exactly one owner and draw call.
    for(const [x,y]of [[230,157],[249,157],[269,157],[218,147],[240,147]])drawLoaf(ctx,{x,y,packaged:false},assets);
    if(world.emptyBagVisible)drawSmallProp(ctx,assets,'bagEmpty',242,157);
    if(world.customer.visible)layers.push({depth:world.customer.y,draw:()=>genericPerson(ctx,world.customer,'customer')});
    if(world.bag.visible&&world.bag.owner==='stage')drawBag(ctx,world.bag,assets);
    layers.push({depth:world.actor.y,draw:()=>{drawActor(ctx,world.actor,assets);if(world.bag.visible&&world.bag.owner==='hand')drawBag(ctx,world.bag,assets);if(world.bread.owner==='hand')drawLoaf(ctx,world.bread,assets);drawPhone(ctx,world.phone,assets,world.actor);}});
    if(world.bread.owner!=='hand')layers.push({depth:world.bread.owner==='shelf'?254.5:world.bread.owner==='trolley'?world.bread.y+.5:world.bread.y,draw:()=>drawLoaf(ctx,world.bread,assets)});
    if(!trolleyImage)layers.push({depth:328,draw:()=>drawTrolley(ctx,true)});
    if(world.phone.unread)layers.push({depth:500,draw:()=>{ctx.fillStyle='#bcb28b';ctx.fillRect(Math.round(world.actor.x)-5,Math.round(world.actor.y)-86,4,3);}});
  } else {
    const world=state.school;drawChalk(ctx,world.board);
    const deskDepth=assets.manifest.occluders?.school?.find(occ=>occ.name==='studentUpperLeft')?.depth??277;
    layers.push({depth:deskDepth+.1,draw:()=>drawNotebook(ctx,world)});
    if(world.actor.pose==='help')layers.push({depth:deskDepth+.2,draw:()=>drawDeskContact(ctx,world,assets)});
    layers.push({depth:world.chair.y-.1,draw:()=>drawChair(ctx,world.chair,assets)});
    for(const p of world.pupils)if(p.visible)layers.push({depth:p.y,draw:()=>genericPerson(ctx,p)});
    layers.push({depth:world.actor.y,draw:()=>{drawActor(ctx,world.actor,assets);drawPhone(ctx,world.phone,assets,world.actor);}});
  }
  for(const occ of assets.manifest.occluders?.[side]||[])layers.push({depth:occ.depth,draw:()=>drawOccluder(ctx,{...occ,side},assets)});
  layers.sort((a,b)=>a.depth-b.depth).forEach(layer=>layer.draw());ctx.restore();
}

function quietAudio(notify) {
  let context=null,ambient=null,muted=true,paused=true;
  function ensure() {
    if(context)return context;
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio){notify();return null;}
    try {context=new Audio();return context;}catch {notify();return null;}
  }
  async function activate() {
    if(muted||paused)return;const c=ensure();if(!c)return;
    try {if(c.state==='suspended')await c.resume();
      if(!ambient) {const osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.value=72;gain.gain.value=.0018;osc.connect(gain);gain.connect(c.destination);osc.start();ambient={osc,gain};}
      ambient.gain.gain.setTargetAtTime(.0018,c.currentTime,.1);
    }catch {notify();}
  }
  function hush() {if(ambient&&context)ambient.gain.gain.setTargetAtTime(0,context.currentTime,.025);}
  function cue(kind) {
    if(muted||paused)return;const c=ensure();if(!c||c.state!=='running')return;
    const now=c.currentTime;
    if(kind==='rustle') {
      const buffer=c.createBuffer(1,Math.round(c.sampleRate*.12),c.sampleRate),arr=buffer.getChannelData(0);let seed=731;
      for(let i=0;i<arr.length;i++){seed=(seed*16807)%2147483647;arr[i]=((seed/2147483647)*2-1)*(1-i/arr.length);}
      const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();src.buffer=buffer;filter.type='highpass';filter.frequency.value=1700;gain.gain.value=.013;src.connect(filter);filter.connect(gain);gain.connect(c.destination);src.start(now);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
    } else {
      const notes=kind==='bell'?[660,880]:kind==='checkout'?[740]:[520,640];
      notes.forEach((freq,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,now+i*.08);g.gain.linearRampToValueAtTime(kind==='bell'?.018:.009,now+i*.08+.015);g.gain.exponentialRampToValueAtTime(.0001,now+i*.08+.26);o.connect(g);g.connect(c.destination);o.start(now+i*.08);o.stop(now+i*.08+.28);o.onended=()=>{o.disconnect();g.disconnect();};});
    }
  }
  return {setMuted(value){muted=value;muted?hush():activate();},setPaused(value){paused=value;paused?hush():activate();},cue,
    destroy(){try{ambient?.osc.stop();context?.close();}catch{}ambient=null;context=null;}};
}

export async function createGame(options) {
  const {storeCanvas,schoolCanvas,onUpdate=()=>{},onEvent=()=>{}}=options||{};
  if(!storeCanvas||!schoolCanvas)throw new Error('Игровые экраны не найдены.');
  const contexts={store:storeCanvas.getContext('2d'),school:schoolCanvas.getContext('2d')};
  if(!contexts.store||!contexts.school)throw new Error('Не удалось открыть игровой экран.');
  storeCanvas.width=schoolCanvas.width=WIDTH;storeCanvas.height=schoolCanvas.height=HEIGHT;
  const assets=options.assets||await loadAssets(options.manifestURL||new URL('./assets/manifest.json',import.meta.url),options.imageLoader);
  const geometry=buildGeometry(assets.manifest);
  const clock=options.clock||{now:()=>performance.now(),requestFrame:callback=>requestAnimationFrame(callback),cancelFrame:id=>cancelAnimationFrame(id)};
  let storage=options.storage;
  if(storage===undefined) {try {storage=globalThis.localStorage;}catch {storage=null;}}
  const stored=loadSave(storage);
  let elapsed=0,phase='ready',speed=stored?.prefs.speed||1,muted=stored?.prefs.muted??true,reducedMotion=stored?.prefs.reducedMotion||false;
  let destroyed=false,raf=null,lastTime=null,ambientTime=0,lastUpdate=-Infinity,lastSave=-Infinity,boostTarget=null,autoPaused=false;
  let savedRecord=stored,storageNoticeShown=false,audioNoticeShown=false,lastScene='S02';
  const audio=quietAudio(()=>{if(!audioNoticeShown){audioNoticeShown=true;onEvent({type:'notice',text:'Звук сейчас недоступен.'});}});
  function currentState() {return stateAt(elapsed,{geometry});}
  function snapshot() {const state=currentState();return {...state,phase,canAdvance:phase==='playing'&&elapsed<TOTAL_DURATION,hasSave:!!savedRecord&&savedRecord.elapsed>0&&savedRecord.elapsed<TOTAL_DURATION,speed,muted,reducedMotion,advancing:boostTarget!==null};}
  function draw(t=elapsed) {const state=stateAt(t,{geometry});renderFrame(contexts.store,state,'store',assets,{ambientTime,reducedMotion});renderFrame(contexts.school,state,'school',assets,{ambientTime,reducedMotion});return state;}
  function update(force=false) {if(force||elapsed-lastUpdate>=.10||phase!=='playing') {lastUpdate=elapsed;onUpdate(snapshot());}}
  function persist(force=false) {
    if(elapsed===0||elapsed>=TOTAL_DURATION) {if(elapsed>=TOTAL_DURATION){clearSave(storage);savedRecord=null;}return;}
    if(!force&&elapsed-lastSave<1)return;
    lastSave=elapsed;const record=makeSave(elapsed,{speed,muted,reducedMotion});
    if(saveToStorage(storage,record))savedRecord=record;
    else if(!storageNoticeShown){storageNoticeShown=true;onEvent({type:'notice',text:'Прогресс сохранится только до закрытия страницы.'});}
  }
  function finish() {phase='complete';boostTarget=null;audio.setPaused(true);persist(true);onEvent({type:'complete',sceneId:'S03'});}
  function tick(now=clock.now()) {
    if(destroyed)return snapshot();
    if(lastTime===null)lastTime=now;
    const dt=Math.max(0,Math.min(.1,(now-lastTime)/1000));lastTime=now;
    if(phase==='playing') {
      const before=elapsed,beforeState=currentState(),factor=boostTarget===null?speed:6;
      // A foreground stall never skips an interaction. Normal and boosted frames advance at most 100 ms.
      let after=Math.min(TOTAL_DURATION,elapsed+Math.min(.1,dt*factor));
      if(boostTarget!==null&&after>=boostTarget){after=boostTarget;boostTarget=null;}
      elapsed=after;ambientTime+=dt;
      const afterState=currentState();
      const critical=afterState.sceneId!==beforeState.sceneId||afterState.school.board.complete!==beforeState.school.board.complete||afterState.store.bread.owner!==beforeState.store.bread.owner||
        afterState.store.bread.packaged!==beforeState.store.bread.packaged||afterState.store.phone.owner!==beforeState.store.phone.owner||
        afterState.school.phone.owner!==beforeState.school.phone.owner||
        [...CUES,...MESSAGES].some(cue=>cue.at>before&&cue.at<=after);
      // Commit observable events before drawing, publishing dialogue or playing their cue.
      if(critical)persist(true);
      for(const cue of CUES)if(cue.at>before&&cue.at<=after){audio.cue(cue.kind);onEvent({type:'cue',...cue});}
      const scene=currentState().sceneId;if(scene!==lastScene){lastScene=scene;onEvent({type:'scene',sceneId:scene});}
      if(elapsed>=TOTAL_DURATION)finish();
      draw();persist();update();
    }
    return snapshot();
  }
  function loop(now) {tick(now);if(!destroyed)raf=clock.requestFrame(loop);}
  function begin(t) {elapsed=t;phase=t>=TOTAL_DURATION?'complete':'playing';boostTarget=null;autoPaused=false;lastTime=clock.now();lastUpdate=-Infinity;lastSave=-Infinity;lastScene=currentState().sceneId;audio.setMuted(muted);audio.setPaused(phase!=='playing');draw();persist(true);update(true);return snapshot();}
  function pause(visibility=false) {if(phase==='playing'){phase='paused';autoPaused=visibility;lastTime=null;audio.setPaused(true);persist(true);update(true);}return snapshot();}
  function resume() {if(phase==='paused'){phase='playing';autoPaused=false;lastTime=clock.now();audio.setPaused(false);update(true);}return snapshot();}
  function visibility() {if(globalThis.document?.hidden)pause(true);else if(autoPaused)resume();}
  const pointers=[];
  function pointer(side,canvas,event) {
    if(phase!=='playing')return;
    const rect=canvas.getBoundingClientRect(),screenX=(event.clientX-rect.left)*WIDTH/rect.width,screenY=(event.clientY-rect.top)*HEIGHT/rect.height;
    const camera=cameraAt(elapsed,side,reducedMotion),x=camera.x+(screenX-camera.x)/camera.zoom,y=camera.y+(screenY-camera.y)/camera.zoom;
    const t=elapsed;
    const hit=side==='store'&&((t>=10&&t<23&&x>193&&x<292&&y>125&&y<220)||(t>=102&&t<115&&x<140&&y>60&&y<260))||
      side==='school'&&t>=35&&t<48&&x>164&&x<356&&y>60&&y<147;
    if(hit){game.fastForward();onEvent({type:'interaction',side,at:t});}
  }
  for(const [side,canvas]of [['store',storeCanvas],['school',schoolCanvas]]) {
    const handler=event=>pointer(side,canvas,event);canvas.addEventListener?.('pointerdown',handler);pointers.push([canvas,handler]);
  }
  if(options.listenVisibility!==false)globalThis.document?.addEventListener('visibilitychange',visibility);
  const game={
    start({resume:requested=false}={}) {if(!requested){clearSave(storage);savedRecord=null;}return begin(requested&&savedRecord?savedRecord.elapsed:0);},
    pause(){autoPaused=false;return pause(false);},resume,
    restart(){clearSave(storage);savedRecord=null;return begin(0);},
    setSpeed(value){speed=[1,1.5,2].includes(Number(value))?Number(value):1;persist(true);update(true);return snapshot();},
    setMuted(value){muted=!!value;audio.setMuted(muted);persist(true);update(true);return snapshot();},
    setReducedMotion(value){reducedMotion=!!value;draw();persist(true);update(true);return snapshot();},
    fastForward(){if(phase==='playing'&&boostTarget===null){boostTarget=nextBeatEnd(elapsed);update(true);}return snapshot();},
    serialize(){return makeSave(elapsed,{speed,muted,reducedMotion});},getSnapshot:snapshot,
    stateAt:seconds=>stateAt(seconds,{geometry}),
    renderAt(seconds){return draw(seconds);},
    seek(seconds){const state=stateAt(seconds,{geometry});elapsed=state.elapsed;lastTime=clock.now();lastScene=state.sceneId;boostTarget=null;phase=elapsed>=TOTAL_DURATION?'complete':'paused';audio.setPaused(true);draw();update(true);return snapshot();},
    tick,
    destroy(){destroyed=true;clock.cancelFrame(raf);audio.destroy();for(const [canvas,handler]of pointers)canvas.removeEventListener?.('pointerdown',handler);globalThis.document?.removeEventListener('visibilitychange',visibility);},
  };
  draw();update(true);raf=clock.requestFrame(loop);
  if(typeof window!=='undefined')window.__game=game;
  return game;
}
