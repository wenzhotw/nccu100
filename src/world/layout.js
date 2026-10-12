/**
 * 校園道路中心線與預定地查詢。
 */

/* ---------- 依實際地圖：道路中心線與尚未建置的空地 ---------- */
// 八德道
const bdZ=x=>x<0?-12.8:-12.8+0.12*x;
// 八德道 x>0 那一段是斜的：沿著道路排東西時用這兩個函式換算
const BD_TH=Math.atan(0.12);   // 道路與 x 軸的夾角
/** 八德道中心線上 x 那一點，往南（遠離樂活館、靠電算中心那一側）偏 v 公尺的世界座標 */
const alongBd=(x,v)=>[x+v*Math.sin(BD_TH), bdZ(x)-v*Math.cos(BD_TH)];
/** 反過來：世界座標 → { x 對應的中心線 x、v 往南的偏移 }（只適用 x>0 那一段） */
function bdLocal(wx,wz){ const dx=wx, dz=wz+12.8, s=dx*Math.cos(BD_TH)+dz*Math.sin(BD_TH), v=dx*Math.sin(BD_TH)-dz*Math.cos(BD_TH); return { x:s*Math.cos(BD_TH), v }; }
// 四維道（東西向、斜向）
const swZ=x=>-60.2+0.18*x;
// 室內空間放在遠離校園的 x=300，避免和戶外場景互相看到
const IX=300;
const LOTS=[];
export const MAP_BOUNDS = { x0: -275, x1: 195, z0: 40, z1: -230 };
function inLot(x,z){ for(const l of LOTS){ const dx=x-l.x, dz=z-l.z; if(Math.abs(dx)<l.w/2&&Math.abs(dz)<l.d/2) return l; } return null; }

// 四維道紅磚段的東西端點（行政大樓西側到環山一道）；超出的部分是一般灰色步道
const SIWEI={x0:-96, x1:66};
// 醉夢溪北岸的沿溪道路（依 Google Earth 照片：從體育館南邊沿溪往東接到環山一道，再往東到社資中心）
const CREEK_ROAD=[[-200,-127.9],[-185,-129.7],[-115,-137],[-70,-145.6],[-20,-157.6],[22,-170.6],[40,-185],[176,-186]];
/** 點到沿溪道路中心線的距離 */
function creekRoadDist(x,z){ let best=1e9; for(let i=0;i<CREEK_ROAD.length-1;i++){ const [x0,z0]=CREEK_ROAD[i],[x1,z1]=CREEK_ROAD[i+1], dx=x1-x0, dz=z1-z0, t=Math.max(0,Math.min(1,((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz))); best=Math.min(best,Math.hypot(x-x0-dx*t,z-z0-dz*t)); } return best; }
/** 沿溪道路在某個 x 的 z（給南北向道路接上用） */
function creekRoadZ(x){ for(let i=0;i<CREEK_ROAD.length-1;i++){ const [x0,z0]=CREEK_ROAD[i],[x1,z1]=CREEK_ROAD[i+1]; if(x>=x0&&x<=x1) return z0+(z1-z0)*(x-x0)/(x1-x0); } return null; }

export { BD_TH, CREEK_ROAD, IX, LOTS, SIWEI, alongBd, bdLocal, bdZ, creekRoadDist, creekRoadZ, inLot, swZ };
