/**
 * 道路、廣場等「不屬於任何建築」的區域名稱。
 * 建築自己的區域寫在各建築資料夾的 index.js（zones 欄位）。
 *
 * priority 越小越先判斷。目前的編號：
 *     0 四維堂室內        10 指南路二段      20 正門          30 指南溪畔（river.js）
 *    40 綜合院館          50 田徑場          60 體育館        70 商學院
 *    80 環山一道          90 校內道路       100 預定地       110 噴水池
 *   120 八德道           130 四維道（紅磚段） 131 校園步道  132 醉夢溪畔道路
 *   140 行政大樓旁車道   141 四維堂東側車道  150 四維堂廊道
 *    25 濟賢橋            26 渡賢橋（river.js）
 *   160 中正圖書館前     170 行政大樓前     180 四維堂前      其他：校園大道
 * 新增區域時挑一個空著的數字（例如 75、115）插進去就好。
 */
import { registerZone } from './registry.js';
import { SIWEI, bdZ, creekRoadDist, inLot, swZ } from './layout.js';
import { FZ } from './terrain/fountain.js';

registerZone(10, p => p.z > 18 ? '指南路二段' : null);
registerZone(20, p => p.z > 9 ? '正門' : null);
registerZone(80, p => (Math.abs(p.x + 88) < 2.8 && p.z < 18) ? '環山一道' : null);
registerZone(90, p => (Math.abs(p.x - 96) < 2.4 && p.z < 18) ? '校內道路' : null);
registerZone(100, p => { const l = inLot(p.x, p.z); return l ? l.name + '．預定地' : null; });
registerZone(110, p => Math.hypot(p.x, p.z - FZ) < 10 ? '噴水池' : null);
registerZone(120, p => Math.abs(p.z - bdZ(p.x)) < 2.4 ? '八德道' : null);
registerZone(130, p => (p.x > SIWEI.x0 && p.x < SIWEI.x1 && Math.abs(p.z - swZ(p.x)) < 5.2) ? '四維道' : null);
registerZone(131, p => Math.abs(p.z - swZ(p.x)) < 3 ? '校園步道' : null);
registerZone(132, p => creekRoadDist(p.x, p.z) < 2.6 ? '醉夢溪畔道路' : null);
registerZone(141, p => (Math.abs(p.x + 15.9) < 2 && p.z < swZ(p.x) - 5 && p.z > -160) ? '四維堂東側車道' : null);
registerZone(140, p => (p.x > 19.5 && p.x < 27.3 && p.z < -62) ? '行政大樓旁車道' : null);
registerZone(180, p => p.z < swZ(p.x) ? '四維堂前' : null);
