"""Append accepted authored poses to the complete baseline, preserving NPCs."""
from pathlib import Path
from PIL import Image
import copy
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
PROD, DIST = ROOT/'production', ROOT/'dist'
manifest = json.loads((PROD/'art-contract-interactive-v3.json').read_text())
motion = json.loads((PROD/'nastya-motion-v4.json').read_text())
old = manifest['actors']['nastya']
assert old['frameCount'] == 28 and motion['frameCount'] == 11
assert old['pivot'] == motion['pivot'] == [48,100]
old_image = Image.open(DIST/old['image']).convert('RGBA')
new_image = Image.open(DIST/motion['image']).convert('RGBA')
atlas = Image.new('RGBA',(768,560))
frames,sockets,poses = copy.deepcopy(old['frames']),copy.deepcopy(old['sockets']),copy.deepcopy(old['poses'])
for index in range(28):
    x,y=index%8*96,index//8*112
    atlas.paste(old_image.crop((x,y,x+96,y+112)),(x,y))
    if index in [12,13,14,24,25,26,27]:
        frames[index]['bakedItem']='chalk'
for local,record in enumerate(motion['frames']):
    index=28+local
    sx,sy=local%motion['columns']*96,local//motion['columns']*112
    x,y=index%8*96,index//8*112
    atlas.paste(new_image.crop((sx,sy,sx+96,sy+112)),(x,y))
    frame=copy.deepcopy(record)
    frame.update(index=index,motionLocalIndex=local,rect=[x,y,96,112])
    frames.append(frame)
    sockets[str(index)]=copy.deepcopy(motion['sockets'][str(local)])
    poses[record['name']]=[index]
poses.update(walk={'frames':[28,29,30,31]},
    chalkRaise={'frames':[32,37,34,35,36],'durationsMs':[140,200,210,220,130]},
    chalkLower={'frames':[14,34,37,32],'durationsMs':[200,500,600,500]},chalkRest={'frames':[32]})
target=DIST/'assets/actors/nastya-work-v4.png'
atlas.save(target)
for index in range(28):
    x,y=index%8*96,index//8*112
    assert atlas.crop((x,y,x+96,y+112)).tobytes()==old_image.crop((x,y,x+96,y+112)).tobytes()
manifest.update(version='art-contract-v4-authored-nastya-motion',status='private prototype; independent review has open art blockers')
manifest['actors']['nastya']={**old,'image':'assets/actors/nastya-work-v4.png','rows':5,'frameCount':39,'frames':frames,'sockets':sockets,'poses':poses}
for path in [DIST/'assets/manifest.json',PROD/'art-contract-v4.json']:
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
(PROD/'nastya-motion-integration-v4.json').write_text(json.dumps({
    'baselineManifest':'production/art-contract-interactive-v3.json',
    'legacyAtlas':{'path':old['image'],'sha256':sha(DIST/old['image']),'preservedCells':list(range(28))},
    'motionAtlas':{'path':motion['image'],'sha256':sha(DIST/motion['image']),'appendedCells':list(range(28,39))},
    'output':{'path':'assets/actors/nastya-work-v4.png','sha256':sha(target)},
    'preservedNpcs':sorted(manifest['npcs']),
    'sourceImage':'production/art-source/nastya-motion-source-v4.png',
    'runtimeSequences':{key:poses[key] for key in ['walk','chalkRaise','chalkLower','chalkRest','chalkStep']},
    'unusedAuthoredCells':[33,38],'rejectedSourcePose':6,
    'knownOpenDefect':'Legacy raised-chalk gait24–27 still has ambiguous opposing support legs.'
},ensure_ascii=False,indent=2)+'\n')
print('Preserved28legacycells and all NPCs; appended11acceptedcells. Raw6rejected.')
