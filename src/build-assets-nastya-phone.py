"""Export the additional Nastya pocket-phone action without mutating v2."""
from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json,shutil

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/workspace/scratch/c320be6a75fa/generated_images/exec-801f21b4-94b1-4cd4-9fa3-894e6443a5b0.png')
DEST=ROOT/'production/art-source/nastya-phone-source-v1.png'
ASSETS=ROOT/'dist/assets/actors'
REVIEW=ROOT/'production/art-review'
for p in [DEST.parent,ASSETS,REVIEW]:p.mkdir(parents=True,exist_ok=True)
if not DEST.exists():shutil.copy2(SOURCE,DEST)
im=Image.open(DEST).convert('RGBA'); im.putalpha(im.getchannel('A').point(lambda a:255 if a>=160 else 0))
scale=80/(975-497)
feet=[(174,480),(505,480),(886,480),(1270,480),(163,967),(532,970),(964,970),(1334,975)]
hands=[(178,334),(592,303),(895,301),(1282,253),(179,734),(622,782),(949,795),(1266,792)]
names=['sitSettle','pocketContact','phoneLow','phoneHold','phoneType','pocketReturn','halfRise','standNeutral']
atlas=Image.new('RGBA',(768,112),(0,0,0,0)); review=Image.new('RGB',(4*288,2*396),'#d8c7ad'); draw=ImageDraw.Draw(review)
info=[]; sockets={}; issues=[]
for i in range(8):
    cx=i%4*384;cy=i//4*512;bottom=cy+512
    # Generated standing hair in cell7 crosses the assumed512px row line.
    # Cut at the real transparent gap between upper soles and lower hair.
    if i<4:bottom=492
    if i==7:cy=492;bottom=1024
    tile=im.crop((cx,cy,cx+384,bottom));bbox=tile.getchannel('A').getbbox();cut=tile.crop(bbox)
    cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
    fx,fy=feet[i];ox=round(48-(fx-cx-bbox[0])*scale);oy=round(100-(fy-cy-bbox[1])*scale)
    frame=Image.new('RGBA',(96,112),(0,0,0,0));frame.alpha_composite(cut,(ox,oy));px=frame.load()
    for y in range(112):
        for x in range(96):
            r,g,b,a=px[x,y]
            if not a:px[x,y]=(0,0,0,0)
    hx,hy=hands[i];socket=[round(48+(hx-fx)*scale),round(100+(hy-fy)*scale)];offset=[socket[0]-48,socket[1]-100]
    pixel_near=any(frame.getpixel((x,y))[3] for x in range(max(0,socket[0]-2),min(96,socket[0]+3)) for y in range(max(0,socket[1]-2),min(112,socket[1]+3)))
    if not pixel_near:issues.append({'index':i,'issue':'hand socket farther than2px from opaque hand'})
    bounds=list(frame.getchannel('A').getbbox())
    if bounds[0]<2 or bounds[1]<2 or bounds[2]>94 or bounds[3]>110:issues.append({'index':i,'issue':'unsafe padding','bounds':bounds})
    atlas.alpha_composite(frame,(i*96,0));frame.save(ASSETS/f'nastya__{names[i]}__phone_v1_f000.png')
    view=frame.resize((288,336),Image.Resampling.NEAREST);vx=i%4*288;vy=i//4*396;review.paste(view,(vx,vy),view)
    draw.text((vx+8,vy+340),f'{i} {names[i]}',fill='#263235');draw.text((vx+8,vy+360),f'hand {offset[0]},{offset[1]}',fill='#263235')
    sockets[str(i)]={'hand':socket,'handOffset':offset,'bakedItem':None}
    info.append({'index':i,'name':names[i],'sourceCell':[cx,cy,384,bottom-cy],'sourceFeet':[fx,fy],'sourceHand':[hx,hy],'scale':scale,'bounds':bounds,'hand':socket,'handOffset':offset,'sourceHandPoint':'near palm/contact pixel, not a free floating prop point'})
atlas.save(ASSETS/'nastya-phone-action-v1.png');review.save(REVIEW/'nastya-phone-all8-native-x3-v1.png')
contract={
 'version':'nastya-pocket-phone-action-v1','status':'exported-proposed; independent in-engine motion critique pending',
 'actor':'nastya','image':'assets/actors/nastya-phone-action-v1.png','frameWidth':96,'frameHeight':112,'columns':8,'rows':1,'frameCount':8,'pivot':[48,100],
 'poses':{'sitDown':[7,6,0],'pocketTake':[1,2,3],'phoneHold':[3],'phoneType':[3,4,3],'pocketPut':[3,2,5],'standUp':[5,6,7]},
 'sockets':sockets,'frames':info,
 'ownership':{'initial':'actor-pocket-hidden','takeAt':{'frame':1,'visible':'phone prop at near pocket-hand socket'},'held':'phone prop only; none baked in any frame','putAt':{'frame':5,'visible':'phone prop at same near pocket-hand socket then hide','nextOwner':'actor-pocket-hidden'}},
 'chair':{'source':'assets/props/chair-v1.png','anchorMeaning':'seated hip, not foot pivot','suggestedSeatOffset':[19,-24],'engineProposal':{'renderSize':[29,40],'left':235,'top':202,'floor':242,'status':'proposed; actual chair/hip contact pending live inspection'},'note':'Use one separate chair fixed across the sequence; inspect actual chair/hip contact in engine.'},
 'suggestedDurationsMs':{'sitDown':[180,250,220],'pocketTake':[200,200,260],'phoneType':[550,160,500],'pocketPut':[220,220,220],'standUp':[180,300,220]},
 'integration':{'atlas':'assets/actors/nastya-work-v3.png','firstIndex':16,'lastIndex':23,'mapping':'local frame i is active atlas index i+16'},
 'notes':['Same global source-to-native scale preserves seated head size; no per-pose body-height normalization.','Sit down uses standing frame7, actual half-rise frame6 in reverse, then seated settling frame0. Pocket contact is a separate later take stage.','Frame1 and5 are the same near trousers pocket touch. A phone must become hidden only there; do not vanish at chest.','No phone baked in the sprites. Render one independent phone prop tied to real palm socket; preserve ownership through reverse action.','Standalone phone source/export is retained; active v3 appends exact copies at indices16–23.','Unobserved bag/other-actor motion is outside this additional task.'],
 'provenance':{'method':'built-in image_gen; one generation pass, no repair used','source':'production/art-source/nastya-phone-source-v1.png','generatorFile':SOURCE.name,'sourceSha256':hashlib.sha256(DEST.read_bytes()).hexdigest(),'references':['production/art-source/nastya-source-v1.png','dist/assets/actors/nastya__phone__f000.png'],'export':'binary alpha threshold160; one global scale; measured source hands/feet; native nearest; no synthesized limb tween'},
 'mechanicalQA':{'issues':issues,'alphaValues':sorted(set(atlas.getchannel('A').get_flattened_data())),'nativeSize':list(atlas.size)},
}
(ROOT/'production/nastya-phone-action-v1.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'contract':str(ROOT/'production/nastya-phone-action-v1.json'),'sockets':sockets,'issues':issues},ensure_ascii=False))
