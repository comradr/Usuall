import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=fs.readFileSync('dist/ui.js','utf8').replace(/^import[^\n]+\n/,'');
class Element{
 constructor(id=''){this.id=id;this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.open=false;this.isConnected=true;this.scrollTop=0;this.scrollHeight=0;this.clientHeight=200;this.attrs={};this.checked=false;this.tagName='DIV';}
 addEventListener(t,f){(this.listeners[t]??=[]).push(f);}
 fire(t,e={}){for(const f of this.listeners[t]||[])f({target:this,preventDefault(){},...e});}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...n){this.children.push(...n);this.scrollHeight=this.children.length*40;}
 replaceChildren(...n){this.children=n;this.scrollHeight=n.length*40;}
 showModal(){this.open=true;}close(){this.open=false;}focus(){document.activeElement=this;}
 closest(q){return ['BUTTON','INPUT','SELECT'].includes(this.tagName)?this:null;}
}
const ids=[...fs.readFileSync('dist/index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
const queries={};function media(q){return queries[q]??=(Object.assign(new Element(q),{matches:false}));}
const document={hidden:false,activeElement:null,listeners:{},getElementById:id=>elements[id],createElement:tag=>Object.assign(new Element(),{tagName:tag.toUpperCase()}),addEventListener(t,f){(this.listeners[t]??=[]).push(f);},fire(t,e={}){for(const f of this.listeners[t]||[])f({preventDefault(){},target:new Element(),...e});}};
let onUpdate,started=0,pauseCount=0,resumeCount=0;
let state={phase:'ready',dialogue:[],actions:[],hasSave:false,muted:true,speed:1,reducedMotion:false,store:{phone:{visible:false}},school:{phone:{visible:false}}};
const publish=()=>onUpdate({...state});
const game={getSnapshot:()=>({...state}),start(){started++;state.phase='playing';publish();},pause(){pauseCount++;state.phase='paused';publish();},resume(){resumeCount++;state.phase='playing';publish();},setMuted(v){state.muted=v;publish();},setSpeed(v){state.speed=v;publish();},setReducedMotion(v){state.reducedMotion=v;publish();},performAction(){return {accepted:true};}};
elements.game.requestFullscreen=()=>Promise.reject(Error('denied'));
const context={document,window:{matchMedia:media},screen:{orientation:{lock:()=>Promise.reject(Error('unsupported'))}},localStorage:{getItem:()=>null,setItem(){}},console,createGame:async o=>{assert.equal(o.listenVisibility,false);onUpdate=o.onUpdate;publish();return game;}};
const report={environment:'Node VM DOM/event substitutes; NOT a browser, no layout or touch proof',independent:false,tests:[]};
const test=(id,run)=>{run();report.tests.push({id,status:'PASS'});console.log('PASS '+id);};
await vm.runInNewContext('(async()=>{'+source+'})()',context);
test('UI-START-FULLSCREEN-REJECTION',()=>{assert.equal(elements.start.disabled,false);elements.start.fire('click');assert.equal(started,1);assert.equal(state.phase,'playing');assert.equal(elements['start-screen'].hidden,true);});
test('UI-MANUAL-MENU-ROTATION-PAUSE',()=>{elements.pause.fire('click');assert.equal(state.phase,'paused');elements.menu.fire('click');elements['close-menu'].fire('click');assert.equal(state.phase,'paused');const q=media('(orientation: portrait)');q.matches=true;q.fire('change');q.matches=false;q.fire('change');assert.equal(state.phase,'paused');elements.pause.fire('click');assert.equal(state.phase,'playing');q.matches=true;q.fire('change');assert.equal(state.phase,'paused');q.matches=false;q.fire('change');assert.equal(state.phase,'playing');});
test('UI-VISIBILITY-COMPOSED-WITH-MENU',()=>{document.hidden=true;document.fire('visibilitychange');assert.equal(state.phase,'paused');elements.menu.fire('click');document.hidden=false;document.fire('visibilitychange');assert.equal(state.phase,'paused');elements['close-menu'].fire('click');assert.equal(state.phase,'playing');});
test('UI-PHONE-OWNERSHIP-SAFE-MESSAGES',()=>{assert.equal(elements.phone.hidden,true);state.school.phone.visible=true;state.dialogue=[{id:'one',speaker:'Настя',text:'<img src=x onerror=alert(1)>'}];publish();assert.equal(elements.phone.hidden,false);assert.equal(elements.messages.children[0].children[1].textContent,state.dialogue[0].text);state.school.phone.visible=false;publish();assert.equal(elements.phone.hidden,true);});
test('UI-ACTION-READY-RUNNING',()=>{state.actions=[{id:'packBread',side:'store',label:'Фасовать хлеб',status:'available'}];publish();assert.equal(elements['store-actions'].children[0].disabled,false);state.actions[0].status='running';publish();assert.equal(elements['store-actions'].children[0].disabled,true);assert.equal(elements['school-actions'].children.length,0);});
await new Promise(resolve=>setImmediate(resolve));
report.status='PASS';report.counts={pass:report.tests.length,fail:0};report.pauseCount=pauseCount;report.resumeCount=resumeCount;
fs.writeFileSync('production/qa-ui-logic.json',JSON.stringify(report,null,2)+'\n');
