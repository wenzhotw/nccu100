"""將 Godot 匯出的照片街區整理成網頁版：移除改用原模組的建築，並簡化成原網頁的低多邊形植栽；可重複執行。"""
import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'src/world/buildings/law-education-route/district.json'
data = json.loads(path.read_text(encoding='utf-8'))
# 法學院、游泳館改用原本的 law-school、swimming-hall 模組，街區不再重複提供。
# 原模組位置上的磚鋪前庭與鳳凰林會被建築蓋住，一併移除。
UPSTREAM_GROUPS = ('LawCollege', 'SwimmingPool')
UPSTREAM_LOTS = ('法學院', '游泳館', '鳳凰林')
UPSTREAM_AREAS = [(-146, -84, -109, -64.5), (-146, -99, -133, -100)]
GROUND = ('lawn', 'road', 'paving')
def in_upstream(x, z):
    return any(x0 <= x <= x1 and z0 <= z <= z1 for x0, x1, z0, z1 in UPSTREAM_AREAS)

data['groups'] = [g for g in data['groups'] if g not in UPSTREAM_GROUPS]
data['lots'] = [l for l in data['lots'] if l['name'] not in UPSTREAM_LOTS]
data['labels'] = [l for l in data['labels'] if not in_upstream(l['matrix'][12], l['matrix'][14])]
data['ramps'] = [r for r in data['ramps'] if not in_upstream(r['matrix'][12], r['matrix'][14])]
data['colliders'] = [c for c in data['colliders'] if not in_upstream((c['x0'] + c['x1']) / 2, (c['z0'] + c['z1']) / 2)]

batches = []
canopies = []
for batch in data['batches']:
    group, surface = batch['name'].split('_')[:2]
    if group in UPSTREAM_GROUPS:
        continue
    if group == 'LawEducationWalk' and surface not in GROUND:
        batch['matrices'] = [m for m in batch['matrices'] if not in_upstream(m[12], m[14])]
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
