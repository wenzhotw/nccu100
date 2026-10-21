/** 官方2F平面圖轉遊戲配置；照片估算，非測繪。入口在西側，挑空在中央偏南。 */
export const ROOM_ID='dah-hsian-2f';
export const INTERIOR_BOUNDS={x0:-22.5,x1:22.5,z0:-22.5,z1:23.5};
export const OUTDOOR_DOOR={x:11.8,z:18.6,r:2.8,room:'dah-hsian',label:'進入達賢圖書館2樓'};
export const INTERIOR_SPAWN={x:-20.5,z:-12,yaw:-Math.PI/2,pitch:.12,face:Math.PI/2};
export const INTERIOR_EXIT={x:-22,z:-12,r:1.6,label:'回達賢戶外'};
export const OUTDOOR_RETURN={x:14.2,y:4,z:18.6,yaw:Math.PI/2,pitch:.12,face:-Math.PI/2};
export const FURNITURE=[
  {name:'櫃台木柱',x:-5.8,z:-7.4,w:1.1,d:1.8,h:4,kind:'core'},
  {name:'館內樓梯封閉入口',x:18,z:20.5,w:3.6,d:6,h:4.2,kind:'stairs'},
  {name:'弧形服務櫃台',x:-7,z:-6,w:4,d:7,h:1.05,kind:'counter'},
  {name:'預約智慧書架',x:-2,z:-17,w:1,d:8,h:2.1,kind:'lockers'},
  {name:'調閱書架',x:-4,z:-17,w:2.4,d:3.8,h:1.15,kind:'reserve'},
  {name:'自助借書機',x:-4,z:-11,w:.8,d:.75,h:1.4,kind:'kiosk'},
  {name:'自助還書機',x:-21.5,z:-7,w:.9,d:1.8,h:1.5,kind:'return'},
  ...[-18,-16.5,-15,-10.5].map(x=>({name:'入館閘門機柱',x,z:-2,w:.35,d:2,h:1.05,kind:'gate'})),
  {name:'入館閘門機柱',x:-13.5,z:-2,w:.35,d:2,h:1.05,kind:'gate'},
  ...[-17,-11,-5,1,7,13].map(x=>({name:'窗邊閱讀椅',x,z:20.8,w:.65,d:.65,h:.9,kind:'chair'})),
  ...[-17,-11,-5,1,7,13].map(x=>({name:'窗邊閱讀桌',x,z:22,w:2.4,d:1.2,h:.76,kind:'table'})),
  ...[-19,-13].map(x=>({name:'體驗桌',x,z:9,w:2,d:2,h:.72,kind:'table'})),
  ...[-17,-13,-5,1,7].map(x=>({name:'期刊展示架',x,z:17,w:2.2,d:.55,h:1.4,kind:'books'})),
  {name:'閱覽沙發',x:-18.5,z:14,w:3.6,d:1.3,h:.85,kind:'sofa'},
  {name:'閱覽單椅',x:11,z:18,w:1.1,d:1.2,h:.95,kind:'chair'},
];
export const COLUMNS=[[-22,-22],[-15,-22],[-8,-22],[-1,-22],[-22,0],[-15,0],[-1,0],[-22,16],[-8,16],[-1,16],[14,24]];
export const WALLS=[
  {x:-6.1,z:-18,w:.1,d:9.5,h:3.6,kind:'clear'},
  {x:0,z:-3,w:.4,d:38,h:4.2},
  {x:11,z:16,w:22,d:.4,h:4.2},
  {x:-22.9,z:-18,w:.2,d:10,h:4.2},{x:-22.9,z:6,w:.2,d:32,h:4.2},
  {x:-.5,z:-23,w:45,d:.2,h:4.2},{x:-.5,z:24,w:45,d:.2,h:4.2},
  {x:22.9,z:.5,w:.2,d:47,h:4.2},
];
export function interiorColliders(){
  return [...WALLS,...FURNITURE,...COLUMNS.map(([x,z])=>({x,z,w:.7,d:.7,h:4.2})),
    {x:11,z:-3,w:22,d:38,h:4.2}].map(o=>({x0:o.x-o.w/2,x1:o.x+o.w/2,z0:o.z-o.d/2,z1:o.z+o.d/2,top:o.h}));
}
export function interiorZone(p){return p.z>16?'達賢2樓・窗邊閱覽區':p.z>0?'達賢2樓・挑空展示區':'達賢2樓・大廳';}
