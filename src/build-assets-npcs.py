"""Slice the generated transparent NPC sheet; no painted/generated pixels are introduced."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'production/art-source/npcs-source-v1.png'
im=Image.open(SOURCE).convert('RGBA')
rows=[(0,283),(283,532),(532,829)]
names=['pupilBoy','pupilGirl','shopper']
out=ROOT/'dist/assets/npcs';out.mkdir(parents=True,exist_ok=True)
manifest_path=ROOT/'dist/assets/manifest.json'
m=json.loads(manifest_path.read_text());m['npcs']={}
for r,(key,(y0,y1)) in enumerate(zip(names,rows)):
    cells=[]
    for col in range(8):
        cell=im.crop((round(col*im.width/8),y0,round((col+1)*im.width/8),y1))
        cell.putalpha(cell.getchannel('A').point(lambda a:255 if a>=128 else 0))
        cells.append(cell)
    bbox0=cells[0].getbbox()
    scale=(80 if key=='shopper' else 54)/(bbox0[3]-bbox0[1])
    atlas=Image.new('RGBA',(96*8,112));frames=[]
    for col,cell in enumerate(cells):
        bbox=cell.getbbox();alpha=cell.getchannel('A')
        feet=[]
        for y in range(max(bbox[1],bbox[3]-12),bbox[3]):
            for x in range(bbox[0],bbox[2]):
                if alpha.getpixel((x,y)):feet.append(x)
        foot=(min(feet)+max(feet))/2
        crop=cell.crop(bbox);size=(round(crop.width*scale),round(crop.height*scale))
        sprite=crop.resize(size,Image.Resampling.NEAREST)
        dx=round(48-(foot-bbox[0])*scale);dy=100-size[1]
        frame=Image.new('RGBA',(96,112));frame.alpha_composite(sprite,(dx,dy))
        # Source hand landmarks; snap only metadata to the nearest actual skin pixel.
        tx=[.32,.24,.30,.30,.38,.15,.23,.44][col]*cell.width
        ty=(174 if key=='shopper' else 170)
        candidates=[]
        for yy in range(max(0,int(ty)-22),min(cell.height,int(ty)+22)):
            for xx in range(max(0,int(tx)-22),min(cell.width,int(tx)+22)):
                R,G,B,A=cell.getpixel((xx,yy))
                if A and R>195 and R-G>20 and G-B>20:candidates.append(((xx-tx)**2+(yy-ty)**2,xx,yy))
        _,sx,sy=min(candidates) if candidates else (0,tx,ty)
        hand=[round(dx+(sx-bbox[0])*scale),round(dy+(sy-bbox[1])*scale)]
        atlas.alpha_composite(frame,(col*96,0))
        frames.append({'index':col,'rect':[col*96,0,96,112],'pivot':[48,100],'hand':hand,'opaqueBounds':list(frame.getbbox())})
    file=out/(key+'-v1.png');atlas.save(file)
    poses={'idle':[0],'walk':[1,2,3,4],'seated':[5],'writing':[6],'raised':[7]}
    if key=='shopper':poses={'idle':[0],'walk':[1,2,3,4],'reach':[5],'pickup':[5,6],'carry':[6],'carryWalk':[1,2,3,4]}
    m['npcs'][key]={'image':'assets/npcs/'+file.name,'frameWidth':96,'frameHeight':112,'columns':8,'pivot':[48,100],'poses':poses,'frames':frames,'sockets':{str(f['index']):{'hand':f['hand']} for f in frames},'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'normalization':'Uniform row scale, nearest neighbor, feet baseline, alpha cleanup only; poses authored in source'}
manifest_path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('Exported 24 authored NPC frames; original actors/rooms/props unchanged')
