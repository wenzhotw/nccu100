// 只針對活動 ID 選服裝，不以全校 NPC 的髮型、性別或學院名稱猜測。
const suits = ['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'C03'];
const suitColors = ['#243d60', '#3b405b', '#30485d'];
const profiles = Object.fromEntries(suits.map((id, i) => [id, {
  kind: 'suit', culture: '商學院西裝', look: { suit: true, top: suitColors[i % 3], pants: suitColors[i % 3], tie: i % 2 ? '#c69b3c' : '#a74750' },
}]));
Object.assign(profiles, {
  D01: { kind: 'profession', culture: '長袍馬褂', look: { top: '#3a4667', pants: '#c9ad84' } },
  D19: { kind: 'profession', culture: '新聞記者', pose: 'microphone', look: { top: '#f4f4ee', pants: '#30485d', hairStyle: 'short' } },
  D21: { kind: 'profession', culture: '攝影工作者', look: { top: '#c9ad84', pants: '#3b4050', hairStyle: 'short' } },
  D23: { kind: 'language', culture: '英格蘭伊麗莎白時代戲劇服', look: { top: '#a94d6a', pants: '#ece6d8' } },
  D24: { kind: 'language', culture: '巴勒斯坦刺繡 thob', look: { top: '#356d86', pants: '#356d86' } },
  D25: { kind: 'language', culture: '俄羅斯 sarafan', look: { top: '#ece6d8', pants: '#b94965', hairStyle: 'short' } },
  D26: { kind: 'language', culture: '日本女生和服', look: { top: '#b969a4', pants: '#b969a4', hairStyle: 'short', hair: '#30293e' } },
  D27: { kind: 'language', culture: '韓國 jeogori 與 chima', look: { top: '#ece6d8', pants: '#467b9b', hairStyle: 'short', hair: '#30293e' } },
  D28: { kind: 'language', culture: '土耳其鄂圖曼 entari', look: { top: '#e6c67c', pants: '#5d7195', hairStyle: 'short' } },
  D29: { kind: 'language', culture: '西班牙安達魯西亞 flamenco', look: { top: '#d55563', pants: '#d55563', hairStyle: 'short', hair: '#30293e' } },
  D30: { kind: 'language', culture: '越南 áo dài', look: { top: '#51a6a2', pants: '#ece6d8' } },
  D31: { kind: 'profession', culture: '英式法官造型', look: { top: '#30344e', pants: '#30344e', hair: '#ddd5c4', hairStyle: 'short' } },
  C06: { kind: 'profession', culture: '英式法官造型', look: { top: '#30344e', pants: '#30344e', hair: '#ddd5c4', hairStyle: 'short' } },
  D37: { kind: 'profession', culture: '筆電使用者', pose: 'laptop', look: { top: '#4083a1', pants: '#30485d' } },
});

// 第二批：全37系補齊；只覆寫活動造型，不更改內容資料。
Object.assign(profiles, {
  D02: {kind:'social',culture:'復古史學家',pose:'document',look:{top:'#795b43',pants:'#45404a'}},
  D03: {kind:'social',culture:'法式知識分子戲劇造型',pose:'document',look:{top:'#f3eee2',pants:'#242735'}},
  D04: {kind:'political',culture:'使用者指定競選戲仿角色',look:{suit:true,top:'#24518b',pants:'#24518b',tie:'#d32f38',hair:'#e5c15a',hairStyle:'side'}},
  D05: {kind:'social',culture:'街頭訪談研究者',pose:'document',look:{top:'#d6e3e4',pants:'#496074'}},
  D06: {kind:'social',culture:'預算審查員',pose:'document',look:{top:'#f2eee4',pants:'#454957'}},
  D07: {kind:'social',culture:'公共服務人員',pose:'document',look:{top:'#dce8ed',pants:'#45546b'}},
  D08: {kind:'social',culture:'測量工作者',pose:'document',look:{top:'#e5bb4b',pants:'#465c61'}},
  D09: {kind:'social',culture:'經濟分析師',pose:'document',look:{top:'#41495d',pants:'#353a49'}},
  D10: {kind:'social',culture:'田野研究者',pose:'document',look:{top:'#bcaa82',pants:'#73684e'}},
  D20: {kind:'extended',culture:'廣告創意工作者',pose:'document',look:{top:'#df7859',pants:'#39465a'}},
  D22: {kind:'extended',culture:'跨媒體創作者',look:{top:'#459a98',pants:'#43435a'}},
  D32: {kind:'extended',culture:'數學研究者',pose:'document',look:{top:'#f0e6d3',pants:'#394452'}},
  D33: {kind:'extended',culture:'心理學研究者',pose:'document',look:{top:'#a3c6bc',pants:'#4c5a64'}},
  D34: {kind:'extended',culture:'外交談判代表',pose:'document',look:{suit:true,top:'#32445f',pants:'#32445f',tie:'#f1e8dc'}},
  D35: {kind:'extended',culture:'學校老師',pose:'document',look:{top:'#e3e9dc',pants:'#4a5260'}},
  D36: {kind:'extended',culture:'創業提案者',pose:'document',look:{suit:true,top:'#7493aa',pants:'#4e6577',tie:'#edf2ee',shoe:'#f2f0e8'}},
});
const businessColors=['#243d60','#26364f','#626976','#3b4c68','#29394c','#405b76','#34425c','#303e54'];
for (let i=0;i<8;i++) {
  const id=`D${11+i}`, old=profiles[id];
  profiles[id]={...old,pose:'document',look:{...old.look,top:businessColors[i],pants:businessColors[i],tie:i===5?'#ffffff':old.look.tie}};
}

for (const p of Object.values(profiles)) { Object.freeze(p.look); Object.freeze(p); }
export const NPC_COSTUME_PROFILES = Object.freeze(profiles);
export const COSTUME_NPC_IDS = Object.freeze(Object.keys(profiles).map(id => `bz26-${id}`).sort());
export function costumeProfile(id) {
  return typeof id === 'string' && id.startsWith('bz26-') ? profiles[id.slice(5)] || null : null;
}
export function costumeLook(id, original = {}) {
  const p = costumeProfile(id); return p ? { ...original, ...p.look } : original;
}
