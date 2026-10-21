"""Build public booth payload. Usage: python scripts/booth-browser-data-build.py SOURCE_DIRECTORY"""
import json
import sys
from pathlib import Path
source_dir = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
profiles, admissions, portfolios = [json.loads((source_dir / f'{name}.json').read_text()) for name in ('profiles', 'admissions', 'portfolios')]

def sources(items):
    result = []
    for item in items:
        title = item['title']
        try:
            title = title.encode('latin1').decode('utf8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        entry = dict(publicURL=item.get('sourceURL') or item['url'], title=title, year=item.get('year', '未標示'), checkedAt=item['checkedAt'])
        if entry not in result:
            result.append(entry)
    return result

def all_sources(value):
    result = []
    if isinstance(value, dict):
        for k, v in value.items():
            if k == 'sources':
                result.extend(v)
            elif isinstance(v, (dict, list)):
                result.extend(all_sources(v))
    elif isinstance(value, list):
        for item in value:
            result.extend(all_sources(item))
    return result

GROUP_FIELDS = 'code name quota year route thresholds thresholdDisplay ratios screeningResultsInOrder screeningSteps subjectCombinations firstStageScreeningSubjects gsatSubjectsReferenced gsatSubjectsScope sameScoreAdditionalScreening sameScoreThreshold sameScoreThresholdStatus sameScoreNote'.split()
def group(value):
    result = {key: value[key] for key in GROUP_FIELDS}
    result['thresholdLogic'] = {key: value['thresholdLogic'][key] for key in ('mathAorB', 'otherSubjects')}
    result['thresholdLogic']['note'] = '同時將數學A、數學B訂為檢定科目時，僅需一科達標；不能解讀成倍率採計任選。'
    result['apcs'] = value.get('apcs')
    result['secondStageNote'] = '二階學測加權與指定項目比例未核實，請查官方校系分則；第一階段倍率不是總成績加權。'
    result['sources'] = sources(value['sources'])
    return result

groups = {g['code']: group(g) for g in admissions['groups']}
mappings = {d['boothId']: d for d in admissions['departments']}
portfolios = {d['id']: d for d in portfolios['departments']}
notices = {
    'admissions': '115學年度申請入學歷史資料：檢定、倍率與一階篩選結果不是最低錄取分數，也不是116學年度規則。116完整校系分則未納入；部分116參採預告已公布。',
    'courses': '課名為官方課程資料中的實際例子，可能跨學年度、組別或主修；不等於人人必修，也不保證未來每學期開課。',
    'careers': '出路為探索方向，明列官方方向或依課程整理的推論；不保證就業。專業職務可能另需資格、考試或升學。',
    'alumni': '校友職業為來源發表時記錄，不表示目前仍在任；個別經歷不代表全系典型出路或保證。',
    'portfolio': '115學年度官方準備指引摘要與實作建議分列；建議不是官方要求，也不保證加分，不外推為116規則。',
    'interpretation': admissions['interpretation'],
}
result = {'schemaVersion': '1.0', 'checkedAt': profiles['checkedAt'], 'notices': notices, 'departments': []}
for p in profiles['departments']:
    id = p['id']; portfolio = portfolios[id]; mapping = mappings[id]
    codes = mapping['admissionGroupCodes'] or mapping['sharedAdmissionGroupCodes']
    alumni = [{**{k: a[k] for k in ('name', 'affiliation', 'career', 'degreeLevel', 'note')}, 'sources': sources(a['sources'])} for a in p['alumni']['items']]
    d = dict(id=id, name=p['dept'], college=p['college'], intro=p['learning']['text'], courses=p['learning']['courses'], courseNote=notices['courses'],
             careers=[dict(name=name, basis='official' if name in p['careers']['officialDirections'] else 'derived') for name in p['careers']['directions']],
             careerNote=p['careers']['note'], alumni=alumni,
             missingAlumni=None if alumni else '尚無足以同時確認系籍、學位與職涯的具名畢業校友例子；暫缺不代表沒有校友，也不以其他學程或教師替代。',
             admissionsGroups=[groups[code] for code in codes],
             admissionsMapping={'status':mapping['mappingStatus'], 'note':mapping['mappingNote']},
             portfolio=dict(year=115, officialFocus=portfolio['officialFocus'], advice=portfolio['studentPracticeAdvice'], requirements=portfolio['formatAndSpecialRequirements'], groupDifferences=portfolio['groupDifferences'], limitations=portfolio['limitations'], sources=sources(portfolio['sources'])),
             sources=sources(all_sources(p)))
    result['departments'].append(d)
output = root / 'src/systems/baozhong/booth-browser-data.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {len(result["departments"])} booths and {len(groups)} distinct admissions groups.')
