/** 官方2F平面圖轉遊戲配置；照片估算，非測繪。入口在西側，挑空在中央偏南。 */
import {MAIN_ENTRANCE,DECK_Y} from './layout.js';
export const ROOM_ID='dah-hsian-2f';
export const INTERIOR_BOUNDS={x0:-22.5,x1:22.5,z0:-22.5,z1:23.5};
export const OUTDOOR_DOOR={x:MAIN_ENTRANCE.approachX,z:MAIN_ENTRANCE.z,r:2.8,room:'dah-hsian',label:'進入達賢圖書館2樓'};
export const INTERIOR_SPAWN={x:-20.5,z:-12,yaw:-Math.PI/2,pitch:.12,face:Math.PI/2};
export const INTERIOR_EXIT={x:-22,z:-12,r:1.6,label:'回達賢戶外'};
export const OUTDOOR_RETURN={x:MAIN_ENTRANCE.returnX,y:DECK_Y,z:MAIN_ENTRANCE.z,yaw:Math.PI/2,pitch:.12,face:-Math.PI/2};
export const FURNITURE=[
  ...[-12,-8.4,-4.8].map(x=>({name:'大廳窗邊長凳',x,z:-21.9,w:2.8,d:.55,h:.48,kind:'bench'})),
  {name:'櫃台木柱',x:-7.3,z:-6.8,w:1.1,d:1.8,h:4,kind:'core'},
  {name:'西南D梯封閉入口',x:-19,z:20.5,w:3.6,d:6,h:4.2,kind:'stairs'},
  {name:'館內樓梯封閉入口',x:18,z:20.5,w:3.6,d:6,h:4.2,kind:'stairs'},
  {name:'弧形服務櫃台',x:-8,z:-6.2,w:3.8,d:6.2,h:1.05,kind:'counter'},
  {name:'預約智慧書架',x:-1.1,z:-5.1,w:1.2,d:7,h:2.1,kind:'lockers'},
  {name:'調閱書架',x:-3.2,z:-6,w:1.4,d:3.8,h:1.15,kind:'reserve'},
  {name:'自助借書機',x:-3.2,z:-2,w:.8,d:.75,h:1.4,kind:'kiosk'},
  {name:'自助還書機',x:-21,z:-8.15,w:1.4,d:.7,h:1.5,kind:'return'},
  ...[-15,-13.4,-11.8,-10.2].map(x=>({name:'入館閘門機柱',x,z:-6.3,w:.35,d:2,h:1.05,kind:'gate'})),
  ...[-11,-5,1,7,13].map(x=>({name:'窗邊閱讀椅',x,z:20.8,w:.65,d:.65,h:.9,kind:'chair'})),
  ...[-11,-5,1,7,13].map(x=>({name:'窗邊閱讀桌',x,z:22,w:2.4,d:1.2,h:.76,kind:'table'})),
  ...[6,11].map(z=>({name:'體驗桌',x:-20,z,w:2,d:2,h:.72,kind:'table'})),
  ...[-17,-13,-5,1,7].map(x=>({name:'期刊展示架',x,z:17,w:2.2,d:.55,h:1.4,kind:'books'})),
  {name:'閱覽沙發',x:-18.5,z:14,w:3.6,d:1.3,h:.85,kind:'sofa'},
  {name:'閱覽單椅',x:11,z:18,w:1.1,d:1.2,h:.95,kind:'chair'},
];
export const COLUMNS=[[-22,-22],[-15,-22],[-8,-22],[-1,-22],[-22,0],[-15,0],[-1,0],[-22,16],[-8,16],[-1,16],[14,24]];
export const WALLS=[
  {x:-5.3,z:-6.1,w:.1,d:6.8,h:3.6,kind:'clear'},
  {x:-2.65,z:-.4,w:5.3,d:.1,h:3.6,kind:'clear'},
  {x:0,z:-3,w:.4,d:38,h:4.2},
  {x:11,z:16,w:22,d:.4,h:4.2},
  {x:-22.9,z:-18,w:.2,d:10,h:4.2},{x:-22.9,z:6,w:.2,d:32,h:4.2},
  {x:-19,z:-23,w:8,d:.2,h:4.2},{x:-7.5,z:-23,w:15,d:.2,h:4.2,kind:'clear'},{x:11.25,z:-23,w:22.5,d:.2,h:4.2},{x:-.5,z:24,w:45,d:.2,h:4.2},
  {x:22.9,z:.5,w:.2,d:47,h:4.2},
];
// 入口公共前廊與後方關閉隔間；名稱同時供模型及碰撞驗收。
export const ENTRANCE_STRUCTURES=[
 {name:'廁所封閉隔間',x:-19,z:-20.3,w:7.6,d:5.4,h:4.2},
 {name:'廁所東側隱私牆',x:-15.1,z:-20.3,w:.22,d:5.4,h:4.2},
 {name:'廁所前廊工具間',x:-22,z:-16.3,w:1.8,d:2.6,h:4.2},
 {name:'風除室北側牆',x:-21,z:-14.9,w:3.8,d:.2,h:4.2},
 {name:'入口南側B梯與還書室',x:-19,z:-3.9,w:7.4,d:7.4,h:4.2},
 {name:'西側電梯核心',x:-17.1,z:4.8,w:3.8,d:6.4,h:4.2},
 {name:'感恩牆後方機房',x:-1.05,z:-17,w:2.1,d:11.2,h:4.2},
 {name:'感恩牆隔牆',x:-2.35,z:-17,w:.18,d:11.2,h:4.2},
];
export const ENTRANCE_DOORS=[-22.78,-19.2];
export const ENTRANCE_GLAZING=ENTRANCE_DOORS.flatMap(x=>[-14.1,-9.9].map(z=>({x,z,w:.16,d:1.8,h:4.2})));
export const UTILITY_DOOR={name:'工具間側門',label:'工具間',x:-21.04,z:-16.25,w:1,angle:Math.PI/2};
export const RESTROOM_DOORS=[
 {name:'女廁入口門',label:'女廁',x:-19.5,z:-17.57,w:1.1},
 {name:'男廁入口門',label:'男廁',x:-16.7,z:-17.57,w:1.1},
];
export function interiorColliders(){
  return [...WALLS,...ENTRANCE_STRUCTURES,...ENTRANCE_GLAZING,...FURNITURE,...COLUMNS.map(([x,z])=>({x,z,w:.7,d:.7,h:4.2})),
    {x:11,z:-3,w:22,d:38,h:4.2}].map(o=>({x0:o.x-o.w/2,x1:o.x+o.w/2,z0:o.z-o.d/2,z1:o.z+o.d/2,top:o.h}));
}
export function interiorZone(p){if(p.x<-15&&p.z<-15)return '達賢2樓・廁所前廊';return p.z>16?'達賢2樓・窗邊閱覽區':p.z>0?'達賢2樓・挑空展示區':'達賢2樓・大廳';}
