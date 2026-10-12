"""將 Godot 匯出的照片街區簡化成原網頁的低多邊形植栽；可重複執行。"""
import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'src/world/buildings/law-education-route/district.json'
data = json.loads(path.read_text(encoding='utf-8'))
batches = []
canopies = []
for batch in data['batches']:
    if batch['kind'] == 'quad' or batch['name'] == 'LawEducationWalk_leaf_sphere':
        continue
    batch.pop('texture', None)
    if batch['name'] == 'LawEducationWalk_bark_cylinder':
        # 垂直主幹保留，細枝與透明葉片改為原網頁的多面球形樹冠。
        trunks = [m for m in batch['matrices'] if abs(m[4]) < .001 and abs(m[6]) < .001]
        batch['matrices'] = trunks
        for m in trunks:
            scale = abs(m[5]) / 5.2
            base = m[13] - abs(m[5]) / 2
            for dx,y,dz,radius in [(0,5.6,0,2.8),(1.8,5.1,.6,2),(-1.7,5.3,-.6,2),(.2,7,-.2,1.8)]:
                r=round(radius*scale,4)
                canopies.append([r,0,0,0,0,r,0,0,0,0,r,0,round(m[12]+dx*scale,4),round(base+y*scale,4),round(m[14]+dz*scale,4),1])
    batches.append(batch)
batches.append({'name':'LawEducationWalk_leaf_sphere','kind':'sphere','color':'#5cb150','matrices':canopies})
data['batches']=batches
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('toon batches:',len(batches),'instances:',sum(len(b['matrices']) for b in batches))
