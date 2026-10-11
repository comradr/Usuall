/** Ordinary Day — S02/S03. Pure canonical timeline; no DOM, assets or side effects. */
export const MODEL_VERSION = 's02-s03-1';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'obychnyy-den.slice.v1';
export const WIDTH = 480;
export const HEIGHT = 360;
export const TOTAL_DURATION = 189;
export const SCENES = Object.freeze([
  {id: 'S02', title: 'Хлеб и доска', period: 'Утро · рабочий ритм', start: 0, duration: 102},
  {id: 'S03', title: 'Хлеб выставляю', period: 'Позднее утро · перемена', start: 102, duration: 87},
]);
export const BEATS = Object.freeze([
  ['02.01',0,10,'У каждого своё рабочее утро.'],
  ['02.02',10,23,'Можно нажать на ящик с хлебом.'],
  ['02.03',23,35,'Один хлеб. Один пакет.'],
  ['02.04',35,48,'Можно нажать на доску.'],
  ['02.05',48,61,'В классе поднялась рука.'],
  ['02.06',61,79,'Настя подходит к парте.'],
  ['02.07',79,94,'Подготовленный хлеб — в тележку.'],
  ['02.08',94,102,'Два разных дела, одно утро.'],
  ['03.01',102,115,'Можно нажать на стеллаж.'],
  ['03.02',115,124,'Хлеб занимает своё место.'],
  ['03.03',124,136,'Перемена. Теперь можно выдохнуть.'],
  ['03.04',136,147,'Первое сообщение.'],
  ['03.05',147,164,'Вова отвечает, когда руки свободны.'],
  ['03.06',164,181,'Два коротких сообщения.'],
  ['03.07',181,189,'И снова каждый возвращается к своему делу.'],
].map(([id,start,end,hint]) => Object.freeze({id,start,end,hint})));
export const MESSAGES = Object.freeze([
  {id:'message4459710',speaker:'Настя',text:'вова такой занятой',at:136},
  {id:'message4459712',speaker:'Вова',text:'Привет',at:152},
  {id:'message4459713',speaker:'Вова',text:'Хлеб выставляю',at:159},
  {id:'message4459715',speaker:'Настя',text:'оо хлеб это хорошо',at:170},
  {id:'message4459716',speaker:'Настя',text:'как раз у меня закончился',at:176},
]);
export const CUES = Object.freeze([
  {id:'bag',at:28,kind:'rustle'}, {id:'page',at:71,kind:'rustle'},
  {id:'cart',at:91,kind:'rustle'}, {id:'shelf',at:120,kind:'rustle'},
  {id:'break',at:124,kind:'bell'}, {id:'chat-nastya',at:136,kind:'message'},
  {id:'chat-vova',at:152,kind:'message'}, {id:'chat-reply',at:170,kind:'message'},
  {id:'checkout',at:185,kind:'checkout'},
]);
/** Authored v3 frames. Sitting and pocket contact are separate actions. */
export const NASTYA_PHONE_ACTIONS = Object.freeze({
  sitDown:{frames:[23,22,16],durationsMs:[180,250,220]},
  pocketTake:{frames:[17,18,19],durationsMs:[200,200,260]},
  phoneHold:{frames:[19]},
  phoneType:{frames:[19,20,19],durationsMs:[220,160,220]},
  pocketPut:{frames:[19,18,21],durationsMs:[220,220,220]},
  standUp:{frames:[21,22,23],durationsMs:[180,300,220]},
  standNeutral:{frames:[23]},
});
const nastyaSupplementSockets={16:[1,-24],17:[15,-30],18:[2,-30],19:[2,-38],20:[3,-39],21:[15,-31],
  22:[-3,-29],23:[-11,-31],24:[-16,-73],25:[-15,-73],26:[-15,-74],27:[-14,-73]};
export const DEFAULT_GEOMETRY = Object.freeze({
  anchors:{
    source:[210,157], stage:[219,158], trolley:[178,285], shelf:[104,182],
    sourceFeet:[242,220], workFeet:[242,220], cartFeet:[209,304], shelfFeet:[136,245],
    teacherInitial:[262,285], boardFeet:[338,197], helpFeet:[147,288], notebook:[114,225],
    teacherPhoneFeet:[235,242],
  },
  collisions:{store:[{x:193,y:150,width:99,height:49},{x:321,y:173,width:159,height:99},{x:22,y:62,width:98,height:192}],
    school:[{x:51,y:163,width:159,height:68},{x:13,y:211,width:131,height:66},
      {x:0,y:265,width:128,height:81},{x:361,y:202,width:119,height:50},{x:370,y:255,width:110,height:83}]},
  sockets:{
    vova:{idle:[-13,-43],walk:[-15,-43],carryWalk:[-17,-47],reach:[-32,-63],carry:[-17,-47],pack:[-23,-62],
      put:[-32,-63],cart:[-31,-19],phone:[-13,-51],busy:[-23,-62]},
    nastya:{idle:[-12,-43],walk:[-14,-43],chalk:[-32,-69],chalkHigh:[-22,-82],chalkMiddle:[-22,-75],chalkLow:[-25,-66],help:[-33,-63],
      phone:[-11,-48],sit:[-11,-48]},
  },
});
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a+(b-a)*clamp(t);
const smooth = t => {t=clamp(t);return t*t*(3-2*t);};
const lerpPoint = (a,b,t) => [mix(a[0],b[0],t),mix(a[1],b[1],t)];
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
export function normalizedTime(seconds) { return clamp(Number.isFinite(seconds)?seconds:0,0,TOTAL_DURATION); }
export function sceneAt(seconds) { return normalizedTime(seconds)<102 ? SCENES[0] : SCENES[1]; }
export function beatAt(seconds) { const t=normalizedTime(seconds);return BEATS.find(b=>t<b.end)||BEATS[BEATS.length-1]; }
export function nextBeatEnd(seconds) { return beatAt(seconds).end; }
/** Constant-speed polyline; feet travel around actual furniture instead of through it. */
export function sampleRoute(seconds,start,end,points) {
  const p=clamp((seconds-start)/(end-start));
  const lengths=points.slice(1).map((q,i)=>dist(points[i],q));
  const sum=lengths.reduce((a,b)=>a+b,0); let d=p*sum;
  for(let i=0;i<lengths.length;i++) {if(d<=lengths[i]||i===lengths.length-1)return lerpPoint(points[i],points[i+1],lengths[i]?d/lengths[i]:0);d-=lengths[i];}
  return points[0].slice();
}
export function routeDistance(seconds,start,end,points) {return clamp((seconds-start)/(end-start))*points.slice(1).reduce((n,q,i)=>n+dist(points[i],q),0);}
function anchors(geometry) {return {...DEFAULT_GEOMETRY.anchors,...(geometry?.anchors||{})};}
const transitionSockets={liftRaw:[[-32,-63],[-17,-47]],lowerPack:[[-17,-47],[-23,-62]],
  liftStage:[[-23,-62],[-17,-47]],lowerCart:[[-17,-47],[-31,-19]],
  liftCart:[[-31,-19],[-17,-47]],lowerShelf:[[-17,-47],[-32,-63]]};
function socketFor(id,pose,geometry,frame=0,progress=0) {
  const frameSocket=geometry?.actors?.[id]?.frames?.[frame]?.hand||geometry?.actors?.[id]?.frames?.[frame]?.sockets?.hand||geometry?.actors?.[id]?.sockets?.[String(frame)]?.hand;
  if(Array.isArray(frameSocket)) {
    const pivot=geometry.actors[id].pivot||[48,100];return [frameSocket[0]-pivot[0],frameSocket[1]-pivot[1]];
  }
  if(id==='nastya'&&nastyaSupplementSockets[frame])return nastyaSupplementSockets[frame];
  if(id==='vova'&&transitionSockets[pose])return lerpPoint(...transitionSockets[pose],progress);
  return geometry?.sockets?.[id]?.[pose]||DEFAULT_GEOMETRY.sockets[id][pose]||DEFAULT_GEOMETRY.sockets[id].idle;
}
function actor(id,position,pose,time,progress=0,geometry,facing='left',travelled=0) {
  const poseSpec=geometry?.actors?.[id]?.poses?.[pose]||(id==='nastya'?(NASTYA_PHONE_ACTIONS[pose]||(pose==='chalkStep'?[24,25,26,27]:null)):null);
  const frames=Array.isArray(poseSpec)?poseSpec:poseSpec?.frames;
  const looping=['idle','walk','carryWalk','busy','phone','sit'].includes(pose);
  const moving=['walk','carryWalk','chalkStep'].includes(pose);
  let animationFrame=moving?Math.floor(travelled*(frames?.length||4)/(pose==='chalkStep'?16:32))%Math.max(1,frames?.length||4):looping?Math.floor(time*(pose==='phone'?3:2))%Math.max(1,frames?.length||4):Math.min((frames?.length||6)-1,Math.floor(clamp(progress)*(frames?.length||6)));
  if(!moving&&!looping&&poseSpec?.durationsMs?.length===frames?.length) {
    // Round below the sampling resolution so decimal phase boundaries select the next frame consistently.
    let remaining=Math.round(clamp(progress)*poseSpec.durationsMs.reduce((sum,duration)=>sum+duration,0)*1e6)/1e6;
    for(let i=0;i<frames.length;i++) {animationFrame=i;if(remaining<poseSpec.durationsMs[i]||i===frames.length-1)break;remaining-=poseSpec.durationsMs[i];}
  }
  const frame=frames?.[animationFrame]??animationFrame;
  const originalSocket=socketFor(id,pose,geometry,frame,progress),socket=[originalSocket[0]*(facing==='right'?-1:1),originalSocket[1]];
  return {id,x:position[0],y:position[1],pose,frame,animationFrame,progress:clamp(progress),facing,
    hand:{x:position[0]+socket[0],y:position[1]+socket[1]},socket:[...socket],travelled};
}
const glyphs={
  '7':[[[0,0],[8,0],[2,14]]], '+':[[[0,7],[8,7]],[[4,3],[4,11]]],
  '5':[[[8,0],[0,0],[0,6],[6,6],[8,8],[8,12],[6,14],[0,14]]],
  '=':[[[0,3],[8,3]],[[0,10],[8,10]]],
  '1':[[[2,3],[5,0],[5,14]],[[2,14],[8,14]]],
  '2':[[[0,2],[2,0],[6,0],[8,2],[8,5],[0,14],[8,14]]],
};
export const CHALK_STROKES = Object.freeze(['7','+','5','=','1','2'].flatMap((g,i)=>glyphs[g].map(s=>s.map(([x,y])=>[194+i*17+x,113+y]))));
const chalkSteps=[];
for(let i=0;i<CHALK_STROKES.length;i++) {
  const stroke=CHALK_STROKES[i];
  const glyph=Math.floor((stroke[0][0]-194)/17);
  if(i)chalkSteps.push({a:CHALK_STROKES[i-1].at(-1),b:stroke[0],draw:false,length:6,glyph,previousGlyph:Math.floor((CHALK_STROKES[i-1][0][0]-194)/17)});
  for(let k=1;k<stroke.length;k++)chalkSteps.push({a:stroke[k-1],b:stroke[k],draw:true,length:dist(stroke[k-1],stroke[k]),glyph});
}
const totalChalkLength=chalkSteps.reduce((n,s)=>n+s.length,0);
function chalkPoint(point,glyph) {
  const unquantizedY=115+(point[1]-113)*16/14;
  const y=[115,122,131].reduce((best,next)=>Math.abs(next-unquantizedY)<Math.abs(best-unquantizedY)?next:best,115);
  // Six-pixel handwritten glyphs. A three-pixel lower-row slant matches the authored low hand.
  const origin=194+17*glyph,x=origin+(point[0]-origin)*.75-(y===131?3:0);
  return [x,y];
}
export function chalkAt(seconds) {
  const p=clamp((seconds-35)/11.5);let distance=p*totalChalkLength;const segments=[];let contact=null,penDown=false,footX=226,movingBetweenGlyphs=false;
  for(const step of chalkSteps) {
    const amount=clamp(distance/step.length);
    if(amount>0) {const end=chalkPoint(lerpPoint(step.a,step.b,amount),step.glyph);
      if(step.draw)segments.push([chalkPoint(step.a,step.glyph),end]);contact=end;penDown=step.draw;
      movingBetweenGlyphs=!step.draw&&step.previousGlyph!==step.glyph;
      footX=226+17*(step.draw?step.glyph:mix(step.previousGlyph,step.glyph,amount));}
    if(distance<step.length)break;distance-=step.length;
  }
  if(seconds<35||seconds>=46.5)contact=null;
  return {equation:'7 + 5 = 12',text:'7 + 5 = 12',segments,progress:p,complete:p>=1,contact:contact?{x:contact[0],y:contact[1]}:null,
    penDown,movingBetweenGlyphs,stationaryPenUp:!!contact&&!penDown&&!movingBetweenGlyphs,footX};
}
function storeAt(t,geometry) {
  const a=anchors(geometry);let pos=[292,306],pose='idle',p=0,travelled=0,facing='left';
  function move(sec,start,end,points,turn=true){travelled=routeDistance(sec,start,end,points);if(turn){const before=sampleRoute(sec-.01,start,end,points),after=sampleRoute(sec+.01,start,end,points);if(Math.abs(after[0]-before[0])>.001)facing=after[0]>before[0]?'right':'left';}return sampleRoute(sec,start,end,points);}
  if(t>=10&&t<23) {pos=move(t,10,23,[[292,306],[288,276],[260,245],a.sourceFeet]);pose='walk';}
  else if(t>=23&&t<25) {pos=a.sourceFeet;pose='reach';p=(t-23)/2;}
  else if(t>=25&&t<26.5) {pos=lerpPoint(a.sourceFeet,a.workFeet,(t-25)/3);pose='liftRaw';p=(t-25)/1.5;}
  else if(t>=26.5&&t<28) {pos=lerpPoint(a.sourceFeet,a.workFeet,(t-25)/3);pose='lowerPack';p=(t-26.5)/1.5;}
  else if(t>=28&&t<32) {pos=a.workFeet;pose='pack';p=(t-28)/4;}
  else if(t>=32&&t<32.3) {pos=a.workFeet;pose='pack';p=1;}
  else if(t>=32.3&&t<35) {pos=move(t,32.3,35,[a.workFeet,[a.workFeet[0]+23,a.workFeet[1]]]);pose='walk';}
  else if(t>=35&&t<76) {pos=[a.workFeet[0]+23,a.workFeet[1]];pose='busy';p=(t%5)/5;}
  else if(t>=76&&t<79) {pos=move(t,76,79,[[a.workFeet[0]+23,a.workFeet[1]],a.workFeet]);pose='walk';}
  else if(t>=79&&t<82) {pos=a.workFeet;pose='pack';p=(t-79)/3;}
  else if(t>=82&&t<83) {pos=a.workFeet;pose='liftStage';p=t-82;}
  else if(t>=83&&t<88) {pos=move(t,83,88,[a.workFeet,[a.workFeet[0],245],a.cartFeet],false);pose='carryWalk';p=(t-83)/5;}
  else if(t>=88&&t<91) {pos=a.cartFeet;pose='lowerCart';p=(t-88)/3;}
  else if(t>=91&&t<94) {pos=a.cartFeet;pose='cart';p=(t-91)/3;}
  else if(t>=94&&t<102) {pos=a.cartFeet;pose='idle';}
  else if(t>=102) {
    const u=t-102;
    if(u<3) {pos=a.cartFeet;pose='cart';p=u/3;}
    else if(u<4) {pos=a.cartFeet;pose='liftCart';p=u-3;}
    else if(u<13) {pos=move(u,4,13,[a.cartFeet,[141,304],a.shelfFeet],false);pose='carryWalk';p=(u-4)/9;}
    else if(u<18) {pos=a.shelfFeet;pose='lowerShelf';p=(u-13)/5;}
    else if(u<22) {pos=a.shelfFeet;pose='put';p=1;}
    else if(u<43) {pos=a.shelfFeet;pose='idle';}
    else if(u<45) {pos=a.shelfFeet;pose='phoneReach';p=(u-43)/2;}
    else if(u<60) {pos=a.shelfFeet;pose='phone';p=(u-45)/15;}
    else if(u<62) {pos=a.shelfFeet;pose='phoneReturn';p=(u-60)/2;}
    else if(u<65) {pos=a.shelfFeet;pose='idle';}
    else if(u<79) {pos=move(u,65,79,[a.shelfFeet,[141,304],[251,308]]);pose='walk';}
    else {pos=[251,308];pose='busy';}
  }
  const person=actor('vova',pos,pose,t,p,geometry,facing,travelled);
  let owner='crate',packaged=false,point=a.source;
  if(t>=25&&t<32) {owner='hand';point=[person.hand.x,person.hand.y];packaged=t>=28;}
  else if(t>=32&&t<82) {owner='stage';point=a.stage;packaged=true;}
  else if(t>=82&&t<91) {owner='hand';point=[person.hand.x,person.hand.y];packaged=true;}
  else if(t>=91&&t<105) {owner='trolley';point=a.trolley;packaged=true;}
  else if(t>=105&&t<120) {owner='hand';point=[person.hand.x,person.hand.y];packaged=true;}
  else if(t>=120) {owner='shelf';point=a.shelf;packaged=true;}
  const phoneActive=t>=147&&t<164;
  const bagVisible=t>=26&&t<28;
  return {actor:person,bread:{id:'loaf-01',owner,packaged,x:point[0],y:point[1]},sourceCount:owner==='crate'?6:5,
    shelfCount:owner==='shelf'?1:0,trolleyCount:owner==='trolley'?1:0,preparedCount:packaged?1:0,totalBread:6,
    phone:{owner:phoneActive?'hand':'pocket',visible:phoneActive,x:person.hand.x,y:person.hand.y,unread:t>=136&&t<147},
    bag:{visible:bagVisible,owner:t<26.5?'stage':'hand',openness:clamp((t-26)/.6),
      x:t<26.5?a.stage[0]:person.hand.x,y:t<26.5?a.stage[1]:person.hand.y},
    emptyBagVisible:t>=35&&t<79,queue:storeQueueAt(t),customer:customerAt(t)};
}
export const STORE_ACTIONS=Object.freeze([
  {id:'arrived',start:0,end:10},{id:'approach-crate',start:10,end:23},
  {id:'grab-pack',start:23,end:35},{id:'work-bags',start:35,end:79},
  {id:'package-to-cart',start:79,end:94},{id:'working-pause',start:94,end:102},
  {id:'cart-to-shelf',start:102,end:124},{id:'shelf-check',start:124,end:147},
  {id:'reply',start:147,end:164},{id:'work-resumes',start:164,end:189},
]);
export const SCHOOL_ACTIONS=Object.freeze([
  {id:'class-arrives',start:0,end:10},{id:'to-board',start:10,end:35},
  {id:'write-arithmetic',start:35,end:48},{id:'hand-raised',start:48,end:61},
  {id:'help-at-desk',start:61,end:79},{id:'lesson',start:79,end:124},
  {id:'break',start:124,end:136},{id:'send-first-message',start:136,end:147},
  {id:'read-answer',start:147,end:164},{id:'reply-about-bread',start:164,end:181},
  {id:'back-to-work',start:181,end:189},
]);
function queueAt(list,t) {const found=list.findIndex(a=>t<a.end),index=found<0?list.length-1:found;return {action:list[index],index,upcoming:list.slice(index+1).map(a=>a.id)};}
function storeQueueAt(t) {return queueAt(STORE_ACTIONS,t);}
function customerAt(t) {
  if(t<42||t>=80)return {visible:false};
  const p=t<56?sampleRoute(t,42,56,[[503,333],[350,333]]):t<65?[350,333]:sampleRoute(t,65,80,[[350,333],[503,333]]);
  return {visible:true,x:p[0],y:p[1],frame:Math.floor(t*5)%4,facing:t<56?'left':'right'};
}
function schoolAt(t,geometry) {
  const a=anchors(geometry);let pos=a.teacherInitial,pose='idle',p=0,travelled=0,facing='left';
  function move(sec,start,end,points){travelled=routeDistance(sec,start,end,points);const before=sampleRoute(sec-.01,start,end,points),after=sampleRoute(sec+.01,start,end,points);if(Math.abs(after[0]-before[0])>.001)facing=after[0]>before[0]?'right':'left';return sampleRoute(sec,start,end,points);}
  const chalkBase=a.chalkFootBase??226,chalkEnd=[chalkBase+85,197];
  if(t>=10&&t<30) {pos=move(t,10,30,[a.teacherInitial,[289,272],[338,254],a.boardFeet]);pose='walk';}
  else if(t>=30&&t<35) {pos=move(t,30,35,[a.boardFeet,[chalkBase,197]]);pose='walk';}
  else if(t>=35&&t<46.5) {
    const chalk=chalkAt(t),c=chalk.contact||{x:194,y:115};
    // Stationary lifts keep the authored high/middle/low arm. Only travel between glyphs steps.
    pos=[chalk.footX+chalkBase-226,197];pose=chalk.movingBetweenGlyphs?'chalkStep':(c.y===115?'chalkHigh':c.y===122?'chalkMiddle':'chalkLow');p=(t-35)/11.5;travelled=pos[0]-chalkBase;
  } else if(t>=46.5&&t<61) {pos=chalkEnd;pose='idle';}
  else if(t>=61&&t<69) {pos=move(t,61,69,[chalkEnd,[330,285],[164,295],a.helpFeet]);pose='walk';}
  else if(t>=69&&t<79) {pos=a.helpFeet;pose='help';p=(t-69)/10;}
  else if(t>=79&&t<102) {pos=a.helpFeet;pose='idle';}
  else if(t>=102) {
    const u=t-102;
    if(u<20) {pos=move(u,0,20,[a.helpFeet,[194,300],[286,270],[311,197]]);pose='walk';}
    else if(u<22) {pos=[311,197];pose='idle';}
    else if(u<28) {pos=move(u,22,28,[[311,197],[287,239],a.teacherPhoneFeet]);pose='walk';}
    else if(t<130.65) {pos=a.teacherPhoneFeet;pose='sitDown';p=(t-130)/.65;}
    else if(t<131.31) {pos=a.teacherPhoneFeet;pose='pocketTake';p=(t-130.65)/.66;}
    else if(t<178) {
      pos=a.teacherPhoneFeet;pose='phoneHold';
      const typingStart=[135.7,169.7,175.7].find(start=>t>=start&&t<start+.6);
      if(typingStart!==undefined){pose='phoneType';p=(t-typingStart)/.6;}
    }
    else if(t<178.66) {pos=a.teacherPhoneFeet;pose='pocketPut';p=(t-178)/.66;}
    else if(t<179.36) {pos=a.teacherPhoneFeet;pose='standUp';p=(t-178.66)/.7;}
    else if(u<81) {pos=a.teacherPhoneFeet;pose='standNeutral';}
    else {pos=move(u,81,87,[a.teacherPhoneFeet,[267,264]]);pose='walk';}
  }
  const person=actor('nastya',pos,pose,t,p,geometry,facing,travelled);
  const board=chalkAt(t);
  if(board.contact) {
    // This target is consumed by renderer's discrete chalk-height sprite selection.
    person.contact=board.contact;person.chalkHeight=clamp(Math.round((128-board.contact.y)/7.5),0,2);
  }
  // The last pupil leaves at 130.65. Ownership changes at an actual pocket-contact pose.
  const phoneActive=t>=130.65&&t<178.66;
  const pupils=pupilsAt(t);
  return {actor:person,board,pupils,lessonActive:t<124,
    phone:{owner:phoneActive?'hand':'pocket',visible:phoneActive,x:person.hand.x,y:person.hand.y},
    chair:{visible:true,x:a.teacherPhoneFeet[0],y:a.teacherPhoneFeet[1],seat:{x:a.teacherPhoneFeet[0]+19,y:a.teacherPhoneFeet[1]-24}},
    notebook:{x:a.notebook[0],y:a.notebook[1],progress:clamp((t-71)/7),helping:t>=71&&t<79},
    queue:queueAt(SCHOOL_ACTIONS,t)};
}
function pupilsAt(t) {
  const seats=[[91,258],[76,318],[406,231],[419,298]];
  return seats.map((seat,i)=>{
    let point=seat,visible=true,walking=false;
    if(t<10) {const start=i*1.4;point=sampleRoute(t,start,start+4.5,[[494,349],[336,349],[336,seat[1]+29],seat]);walking=t<start+4.5;}
    else if(t>=124) {const u=t-124,start=i*0.65;if(u>=start+4.7)visible=false;else {point=sampleRoute(u,start,start+4.7,[seat,[336,seat[1]+29],[336,349],[494,349]]);walking=u>=start;}}
    return {id:'pupil-'+i,x:point[0],y:point[1],visible,walking,frame:Math.floor(t*5+i)%4,
      raised:i===0&&t>=50&&t<64,writing:!walking&&(i===1||i===3)&&t<124,
      helped:i===0&&t>=71,colour:['#71755b','#916454','#65748c','#927d54'][i]};
  });
}
export function stateAt(seconds,options={}) {
  const t=normalizedTime(seconds),scene=sceneAt(t),beat=beatAt(t),geometry=options.geometry;
  return {version:MODEL_VERSION,sceneId:scene.id,sceneTitle:scene.title,period:scene.period,
    elapsed:t,localTime:t-scene.start,totalDuration:TOTAL_DURATION,progress:t/TOTAL_DURATION,
    beatId:beat.id,beatStart:beat.start,beatEnd:beat.end,hint:beat.hint,canAdvance:t<TOTAL_DURATION,
    dialogue:MESSAGES.filter(m=>m.at<=t).map(({id,speaker,text,at})=>({id,speaker,text,at})),
    store:storeAt(t,geometry),school:schoolAt(t,geometry),
    focus:t>=102&&t<111?'store':'split',geometry:anchors(geometry)};
}
export function makeSave(elapsed,prefs={}) {
  return {version:SAVE_VERSION,model:MODEL_VERSION,elapsed:normalizedTime(elapsed),
    prefs:{speed:[1,1.5,2].includes(prefs.speed)?prefs.speed:1,muted:prefs.muted!==false,reducedMotion:prefs.reducedMotion===true}};
}
export function validateSave(input) {
  if(!input||typeof input!=='object'||input.version!==SAVE_VERSION||input.model!==MODEL_VERSION||
    typeof input.elapsed!=='number'||!Number.isFinite(input.elapsed)||input.elapsed<0||input.elapsed>TOTAL_DURATION)return null;
  if(input.prefs!==undefined&&(typeof input.prefs!=='object'||input.prefs===null||Array.isArray(input.prefs)))return null;
  return makeSave(input.elapsed,input.prefs||{});
}
export function loadSave(storage) {
  try {const raw=storage?.getItem(SAVE_KEY);if(typeof raw!=='string'||raw.length>16384)return null;return validateSave(JSON.parse(raw));}catch {return null;}
}
export function saveToStorage(storage,data) {
  const valid=validateSave(data);if(!valid)return false;
  try {storage?.setItem(SAVE_KEY,JSON.stringify(valid));return !!storage;}catch {return false;}
}
export function clearSave(storage) {try {storage?.removeItem(SAVE_KEY);return true;}catch {return false;}}
