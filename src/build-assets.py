"""Export inspected imagegen source art as deterministic native game assets.

This script crops/normalizes art and metadata; it does not invent poses. All
alpha is deliberately binary at game resolution. Original source is retained.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, shutil, hashlib, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets'
PROD = ROOT / 'production'
SRC = PROD / 'art-source'
GENERATED = Path('/workspace/scratch/c320be6a75fa/generated_images')
for folder in [ASSETS, ASSETS/'actors', ASSETS/'props', ASSETS/'occlusion', SRC, PROD/'art-review']:
    folder.mkdir(parents=True, exist_ok=True)
FILES = {
    'store': 'exec-d8fe492e-a3d5-4897-8fe3-b2c11ab9f39d.png',
    'school': 'exec-db0eb170-d56f-44d3-af4a-8e6b0c5acfe1.png',
    'vova': 'exec-1a1055e8-ca74-42cd-896e-8712fcc415ff.png',
    'nastya': 'exec-e4361e09-5668-45f4-b059-760a5cdbced4.png',
    'props': 'exec-30569fdf-5f34-48c1-9799-d884657fdb97.png',
    'vovaActing': 'exec-969beca2-d8c4-470c-805a-2bc9fd524d70.png',
    'walkCorrected': 'exec-d3597dd2-d302-43e4-8fd1-301a2fea1175.png',
    'chalkCarry': 'exec-3998a90f-2610-40b3-99cc-0c9f62cb8cc8.png',
}
sources = {}
for name, filename in FILES.items():
    path = GENERATED/filename
    dest = SRC/f'{name}-source-v1.png'
    if not dest.exists() and path.exists(): shutil.copy2(path, dest)
    im = Image.open(dest)
    sources[name] = im

def binary_rgba(im):
    im = im.convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 160 else 0))
    # Clear the latent matte RGB as well as alpha; avoids accidental later leaks.
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=px[x,y]
            if not a: px[x,y]=(0,0,0,0)
    return im

manifest = {
  'version':'art-contract-v2-native-measured-motion',
  'status':'prototype-exported; not user-approved or browser-motion-approved',
  'logicalSize':[480,360],
  'pixelSampling':'nearest-neighbor',
  'backgrounds':{}, 'actors':{}, 'props':{}, 'occluders':{},
  'anchors':{
    'store':{'initial':[245,275], 'work':[242,220], 'source':[210,157], 'pack':[219,158], 'trolley':[178,285], 'cartFeet':[209,304], 'shelfFeet':[144,264], 'shelf':[104,182]},
    'school':{'initial':[275,225], 'boardFeet':[338,197], 'boardSurface':[164,60,192,77], 'equationBounds':[194,113,88,17], 'teacherDesk':[51,163,159,68], 'teacherNotebook':[177,172], 'studentNotebook':[114,225], 'studentHelpFeet':[147,288], 'breakFeet':[235,242]},
  },
  'obstacles':{
    'store':[[0,52,123,205],[193,165,99,34],[315,158,165,124]],
    'school':[[51,176,159,55],[13,226,131,51],[0,280,128,66],[361,217,119,35],[370,271,110,67]],
  },
  'notes':['Backgrounds contain architecture and fixed furniture only, no main actors/UI/interactive bread/phone/notebooks.', 'Exact socket offsets below are measured from exported pixels; producers must solve feet=contact-handOffset rather than use arbitrary former coordinates.', 'Two raised Vova reach poses are retained for review only; bread manipulation uses forward-lean poses.'],
}
for name in ['store','school']:
    native = sources[name].convert('RGB').resize((480,360), Image.Resampling.NEAREST)
    native.save(ASSETS/f'{name}-bg-v1.png')
    manifest['backgrounds'][name]={'image':f'assets/{name}-bg-v1.png','width':480,'height':360}

# Source landmark coordinates are deliberately recorded, not inferred from the
# uneven generative sheet grid. Hair-to-sole scale preserves standing identity.
actor_specs = {
 'vova':{
   'feet':[(201,500),(565,499),(955,499),(1358,500),(236,994),(590,994),(980,991),(1354,992)],
   'headY':[20,42,39,48,538,541,557,542],
   'hands':[(149,330),(460,297),(878,309),(1206,77),(95,555),(532,746),(874,744),(1306,710)],
   'named':['idle','walkA','walkB','raisedReach','raisedContact','carry','pack','phone'],
   'aliases':{'idle':[0],'walk':[1,2],'reach':[6],'contact':[6],'carry':[5],'pack':[6],'put':[6],'phone':[7]},
   'baked':{7:'phone'},
 },
 'nastya':{
   'feet':[(188,499),(556,500),(946,500),(1356,500),(241,1006),(626,1008),(999,1006),(1295,1005)],
   'headY':[12,12,14,17,525,525,540,574],
   'hands':[(123,308),(446,275),(828,288),(1194,39),(66,535),(435,541),(777,752),(1283,752)],
   'named':['idle','walkA','walkB','boardReach','chalk','point','deskLean','phone'],
   'aliases':{'idle':[0],'walk':[1,2],'reach':[3],'chalk':[3,4],'point':[5],'help':[6],'deskLean':[6],'phone':[7]},
   'baked':{3:'chalk',4:'chalk'},
 },
}
def remove_orphan_pixels(frame, protected_socket=None):
    px=frame.load(); seen=set()
    for y in range(frame.height):
        for x in range(frame.width):
            if not px[x,y][3] or (x,y) in seen: continue
            stack=[(x,y)]; seen.add((x,y)); component=[]
            while stack:
                qx,qy=stack.pop(); component.append((qx,qy))
                for nx,ny in [(qx-1,qy),(qx+1,qy),(qx,qy-1),(qx,qy+1)]:
                    if 0<=nx<frame.width and 0<=ny<frame.height and (nx,ny) not in seen and px[nx,ny][3]:
                        seen.add((nx,ny)); stack.append((nx,ny))
            protected = protected_socket and any(abs(qx-protected_socket[0])<=3 and abs(qy-protected_socket[1])<=3 for qx,qy in component)
            if len(component)<=2 and not protected:
                for qx,qy in component: px[qx,qy]=(0,0,0,0)
    return frame

records={}
for name,spec in actor_specs.items():
    records[name]=[]
    for i in range(8):
        foot=spec['feet'][i]; scale=80/(foot[1]-spec['headY'][i])
        if name=='nastya' and i==7: scale=80/(499-12)
        records[name].append({'source':name,'cell':i,'foot':foot,'hand':spec['hands'][i],'scale':scale,'name':spec['named'][i],'baked':spec['baked'].get(i)})

acting_feet=[(234,509),(605,509),(961,510),(1327,509),(238,980),(625,978),(973,980),(1350,980)]
acting_hands=[(119,323),(531,318),(894,296),(1244,224),(125,839),(499,926),(890,848),(1275,784)]
acting_names=['packA','liftA','carryB','shelfLift','cartBendA','cartContact','cartLiftA','cartLiftB']
for i in range(8):
    records['vova'].append({'source':'vovaActing','cell':i,'foot':acting_feet[i],'hand':acting_hands[i],'scale':80/480,'name':acting_names[i]})

walk_feet={
 'vova':[(213,496),(568,496),(948,495),(1341,492)],
 'nastya':[(207,979),(558,989),(958,982),(1334,989)],
}
walk_hands={
 'vova':[(120,291),(492,284),(848,286),(1240,288)],
 'nastya':[(106,775),(500,747),(841,775),(1257,747)],
}
walk_head_y={'vova':[25,26,25,25],'nastya':[520,520,520,520]}
for name in ['vova','nastya']:
    for i in range(4):
        foot=walk_feet[name][i]
        records[name].append({'source':'walkCorrected','cell':i+(0 if name=='vova' else 4),'foot':foot,'hand':walk_hands[name][i],'scale':80/(foot[1]-walk_head_y[name][i]),'name':['walkContactNear','walkPassingNear','walkContactFar','walkPassingFar'][i]})

carry_feet=[(217,990),(590,990),(952,990),(1365,990)]
carry_hands=[(144,745),(520,745),(889,749),(1279,743)]
for i in range(4):
    records['vova'].append({'source':'chalkCarry','cell':i+4,'foot':carry_feet[i],'hand':carry_hands[i],'scale':80/(carry_feet[i][1]-[518,515,518,515][i]),'name':f'carryWalk{i}'})

chalk_feet=[(246,499),(616,499),(997,499),(1365,499)]
chalk_tips=[(118,20),(491,73),(858,128),(1228,164)]
for i in range(4):
    records['nastya'].append({'source':'chalkCarry','cell':i,'foot':chalk_feet[i],'hand':chalk_tips[i],'scale':80/(499-[34,42,50,60][i]),'name':['chalkHigh','chalkMiddle','chalkLow','chalkLowest'][i],'baked':'chalk','socketKind':'chalk-tip'})

review = Image.new('RGB',(8*96*2,5*132*2),'#d8c7ad')
draw = ImageDraw.Draw(review)
landmarks = {}
for name,spec in actor_specs.items():
    count=len(records[name]); rows=(count+7)//8
    atlas = Image.new('RGBA',(8*96,rows*112),(0,0,0,0))
    sockets = {}; frame_info=[]
    for i,rec in enumerate(records[name]):
        src = binary_rgba(sources[rec['source']])
        cell=rec['cell']; cx=(cell%4)*384; cy=(cell//4)*512
        tile=src.crop((cx,cy,cx+384,cy+512))
        foot=rec['foot']; scale=rec['scale']
        bbox=tile.getchannel('A').getbbox()
        cut=tile.crop(bbox)
        size=(round(cut.width*scale),round(cut.height*scale))
        cut=cut.resize(size,Image.Resampling.NEAREST)
        frame=Image.new('RGBA',(96,112),(0,0,0,0))
        ox=round(48-(foot[0]-cx-bbox[0])*scale)
        oy=round(100-(foot[1]-cy-bbox[1])*scale)
        frame.alpha_composite(cut,(ox,oy))
        frame=binary_rgba(frame)
        hand=rec['hand']
        socket=[round(48+(hand[0]-foot[0])*scale),round(100+(hand[1]-foot[1])*scale)]
        frame=remove_orphan_pixels(frame, socket if rec.get('baked') else None)
        atlas.alpha_composite(frame,((i%8)*96,(i//8)*112))
        sockets[str(i)]={'hand':socket,'handOffset':[socket[0]-48,socket[1]-100]}
        if rec.get('baked'): sockets[str(i)]['bakedItem']=rec['baked']
        if rec.get('socketKind'): sockets[str(i)]['socketKind']=rec['socketKind']
        frame_info.append({'index':i,'name':rec['name'],'source':rec['source'],'sourceCell':[cx,cy,384,512],'sourceFeet':list(foot),'sourceHand':list(hand),'scale':round(scale,6),'bounds':list(frame.getchannel('A').getbbox()),'hand':socket,'handOffset':[socket[0]-48,socket[1]-100]})
        frame.save(ASSETS/'actors'/f'{name}__{rec["name"]}__f000.png')
        row=(0 if name=='vova' else 3)+(i//8); col=i%8
        view=frame.resize((192,224),Image.Resampling.NEAREST)
        review.paste(view,(col*192,row*264),view)
        draw.text((col*192+6,row*264+228),f'{name} {i} {rec["name"]}',fill='#263235')
        draw.text((col*192+6,row*264+245),f'hand {socket[0]-48},{socket[1]-100}',fill='#263235')
    atlas.save(ASSETS/'actors'/f'{name}-work-v2.png')
    poses=dict(spec['aliases'])
    for i,rec in enumerate(records[name]):
        poses.setdefault(rec['name'],[i])
    if name=='vova':
        poses.update({'walk':[16,17,18,19],'carryWalk':[20,21,22,23],'cartReach':[12,13],'cartGrab':[13],'cartLift':[13,14,15,10,5],'shelfLift':[5,11,3,4],'packingHands':[6,8,9],'phoneReach':[11,7],'phoneReturn':[7,11,5,0]})
    else:
        poses.update({'walk':[8,9,10,11],'chalk':[12,13,14],'chalkLevels':[12,13,14,15],'phoneReach':[6,7],'phoneReturn':[7,6,0]})
    manifest['actors'][name]={'image':f'assets/actors/{name}-work-v2.png','frameWidth':96,'frameHeight':112,'columns':8,'rows':rows,'frameCount':count,'pivot':[48,100],'poses':poses,'sockets':sockets,'frames':frame_info,'facing':'left or three-quarter left','status':'exported-alpha-clean; pose craft pending full runtime critic'}
    landmarks[name]=frame_info
review.save(PROD/'art-review'/'all-40-poses-native-x2-v2.png')

prop_specs={
 'bread':((62,305,364,500),(22,13)),
 'bagEmpty':((422,212,686,516),(24,24)),
 'breadPacked':((742,198,1007,532),(24,27)),
 'trolley':((1053,176,1504,553),(56,47)),
 'phone':((108,634,289,911),(8,12)),
 'notebook':((390,668,750,907),(20,13)),
 'chalk':((865,741,1010,848),(4,3)),
 'chair':((1142,571,1441,990),(25,35)),
}
prop_src=binary_rgba(sources['props'])
for name,(box,size) in prop_specs.items():
    item=prop_src.crop(box)
    b=item.getchannel('A').getbbox(); item=item.crop(b).resize(size,Image.Resampling.NEAREST)
    item=binary_rgba(item)
    item.save(ASSETS/'props'/f'{name}-v1.png')
    manifest['props'][name]={'image':f'assets/props/{name}-v1.png','width':size[0],'height':size[1],'pivot':[size[0]//2,size[1]//2],'status':'separated-native-export'}

occlusion_specs={
 'store': [('packingBench',(193,164,292,199),199),('breadShelf',(22,185,119,254),254),('cashCounter',(315,187,480,282),282)],
 'school':[('teacherDesk',(51,176,210,231),231),('studentUpperLeft',(13,226,144,277),277),('studentLowerLeft',(0,280,128,346),346),('studentUpperRight',(361,217,480,252),252),('studentLowerRight',(370,271,480,338),338)],
}
for scene, specs in occlusion_specs.items():
    bg=Image.open(ASSETS/f'{scene}-bg-v1.png').convert('RGBA'); out=[]
    for name,box,depth in specs:
        layer=Image.new('RGBA',(480,360),(0,0,0,0)); layer.paste(bg.crop(box),box[:2]); path=f'assets/occlusion/{scene}-{name}-v1.png'; layer.save(ROOT/'dist'/path)
        out.append({'name':name,'image':path,'bounds':list(box),'depth':depth,'layer':'foreground furniture face; draw only for actor behind contact plane','source':'same native background rectangular occlusion export'})
    manifest['occluders'][scene]=out

(ASSETS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(PROD/'art-contract-v2.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
source_register=[]
for name,filename in FILES.items():
 p=SRC/f'{name}-source-v1.png'; im=Image.open(p); alpha=im.getchannel('A') if im.mode=='RGBA' else None
 source_register.append({'name':name,'originalGeneratorFile':filename,'source':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':list(im.size),'mode':im.mode,'alphaExtrema':list(alpha.getextrema()) if alpha else None,'method':'built-in image_gen','reference':'user supplied reference12 (actors),14 (rooms),13 (props), original new artwork','sourceStatus':'generative source, not an accepted atlas','export':'binary alpha threshold160; native nearest sampling; body-scale normalization; manual source hand/foot landmarks; separated crop; no invented arm animation'})
(PROD/'art-provenance.json').write_text(json.dumps(source_register,ensure_ascii=False,indent=2)+'\n')
# Standard asset rebuilds end on the active v3 contract. Both finalizers prefer
# retained production/art-source PNGs and do not require a surviving scratch run.
subprocess.run([sys.executable, str(ROOT/'src/build-assets-nastya-phone.py')], check=True)
subprocess.run([sys.executable, str(ROOT/'src/build-assets-nastya-v3.py')], check=True)
active = json.loads((ASSETS/'manifest.json').read_text())
print(json.dumps({'manifest':str(ASSETS/'manifest.json'),'version':active['version'],'actors':{k:{'image':v['image'],'frameCount':v['frameCount']} for k,v in active['actors'].items()},'nativeBackgrounds':[str(ASSETS/f'{k}-bg-v1.png') for k in ['store','school']]},ensure_ascii=False))
