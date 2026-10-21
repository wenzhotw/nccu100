/** Read-only presentation of verified facts and explicit gaps. Does not change quiz/rewards. */
export function departmentIntro(record) {
  if (!record) return null;
  const {learning:l={},careers:c={},alumni:a={},admissions:d={}}=record;
  const lines=[`${record.dept}｜課程、出路與申請資訊（資料核對：${record.checkedAt || '待確認'}）`];
  lines.push(l.text || '學什麼：官方課程資料仍在查核，不先填寫。');
  if(l.courses?.length) lines.push(`具體課程例子：${l.courses.join('、')}。`);
  if(l.note) lines.push(l.note);
  lines.push(c.text || '未來方向：尚未完成官方資料查核。');
  lines.push(c.note || '以上僅供探索，不保證畢業後的職位、收入或證照。');
  if(a.items?.length) for(const p of a.items) lines.push(`系友：${p.name}（${p.affiliation}）。${p.career}。${p.note || ''}`);
  else lines.push(`具名系友：${a.note || '尚未找到可確實核對系籍與工作的官方來源。'}`);
  if(a.note&&a.items?.length) lines.push(a.note);
  if(d.groups?.length) {
    lines.push(`${d.year}學年度｜${d.route}。這是第一階段篩選，不是分發錄取分數，也不是明年的保證門檻。`);
    for(const g of d.groups){
      const fmt=(obj,suffix='')=>Object.entries(obj||{}).filter(([,v])=>v!==null&&v!==undefined).map(([k,v])=>`${k}${v}${suffix}`).join('、')||'官方摘要未列';
      lines.push(`招生組：${g.name}（${g.code}），名額${g.quota}。檢定：${fmt(g.thresholds)}。倍率：${fmt(g.ratios,'倍')}。`);
      lines.push(`依序一階篩選結果：${g.screeningResultsInOrder?.join(' → ') || '待查'}。${g.sameScoreAdditionalScreening?'有同級分超額篩選，須再核對規則與分數。':'摘要未列同級分超額篩選。'}`);
    }
    if(d.note)lines.push(d.note);if(d.nextYearStatus)lines.push(d.nextYearStatus);
  } else {
    lines.push(`${d.year || '待查'}學年度｜${d.route || '申請入學'}。第一階段篩選不是分發錄取分數。`);
    lines.push(d.note || '學測申請門檻與一階結果：官方資料待查，不以其他系或其他管道代填。');
    if(d.relatedBooth)lines.push(`請參考${d.relatedBooth}攤位的招生組資訊；本站不虛構獨立招生碼。`);
    if(d.nextYearStatus)lines.push(d.nextYearStatus);
  }
  const sources=[...(l.sources||[]),...(c.sources||[]),...(a.items||[]).flatMap(p=>p.sources||[]),...(d.sources||[])];
  const seen=new Set();for(const s of sources){const u=typeof s==='string'?s:s.url;if(!u||seen.has(u))continue;seen.add(u);lines.push(`來源：${typeof s==='string'?'官方招生資料':s.title || s.publisher || '官方資料'} ${u}`);}
  return lines;
}
