/**
 * 校園道路中心線與預定地查詢。
 */

/* ---------- 依實際地圖：道路中心線與尚未建置的空地 ---------- */
// 八德道
const bdZ=x=>x<0?-12.8:-12.8+0.12*x;
// 四維道（東西向、斜向）
const swZ=x=>-60.2+0.18*x;
// 室內空間放在遠離校園的 x=300，避免和戶外場景互相看到
const IX=300;
const LOTS=[];
function inLot(x,z){ for(const l of LOTS){ const dx=x-l.x, dz=z-l.z; if(Math.abs(dx)<l.w/2&&Math.abs(dz)<l.d/2) return l; } return null; }

export { IX, LOTS, bdZ, inLot, swZ };
