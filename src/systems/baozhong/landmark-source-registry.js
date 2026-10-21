// 逐批抽取既有審過的實物，不把整攤或文字貼圖放大。索引附在測試與來源規格中。
import D04 from './decor/D04.js';
import D05 from './decor/D05.js';
import D06 from './decor/D06.js';
import D07 from './decor/D07.js';
import D08 from './decor/D08.js';
import D09 from './decor/D09.js';
import D10 from './decor/D10.js';
import D12 from './decor/D12.js';
import D13 from './decor/D13.js';
import D14 from './decor/D14.js';
import D15 from './decor/D15.js';
import D16 from './decor/D16.js';
import D17 from './decor/D17.js';
import D18 from './decor/D18.js';
import D02 from './decor/D02.js';
import D03 from './decor/D03.js';
import D19 from './decor/D19.js';
import D20 from './decor/D20.js';
import D22 from './decor/D22.js';
import D23 from './decor/D23.js';
import D24 from './decor/D24.js';
import D25 from './decor/D25.js';
import D27 from './decor/D27.js';
import D28 from './decor/D28.js';
import D29 from './decor/D29.js';
import D30 from './decor/D30.js';
import D33 from './decor/D33.js';
import D34 from './decor/D34.js';
import D35 from './decor/D35.js';
import D36 from './decor/D36.js';
const spec = (build, start, count, label, width = 1.6, height = 1.25, depth = 0.42, spindle = null) => Object.freeze({ build, start, count, label, width, height, depth, spindle });
export const SOURCE_LANDMARKS = Object.freeze({
  D02: spec(D02, 0, 8, '雙耳四足青銅方鼎', 1.45),
  D03: spec(D03, 13, 5, '立體金色問號與底座', 1.0),
  D19: spec(D19, 8, 3, '報紙欄線與頭條', 1.65),
  D20: spec(D20, 10, 4, '幾何創意獎座', 1.15),
  D22: spec(D22, 2, 3, '三向傳播羅盤', 1.65, 1.25, 0.42, { x: -0.9, y: 1.34, z: -0.2, height: 0.8 }),
  D23: spec(D23, 13, 3, '鵝毛筆與墨水瓶', 0.95),
  D24: spec(D24, 0, 6, 'Dallah長嘴咖啡壺', 1.45),
  D25: spec(D25, 3, 6, '三層彩繪套娃', 1.05),
  D27: spec(D27, 2, 4, '青瓦上翹屋簷', 2.3),
  D28: spec(D28, 2, 7, '卡帕多奇亞熱氣球與籃筐', 1.3),
  D29: spec(D29, 2, 4, '文化沙龍雙杯', 1.8),
  D30: spec(D30, 0, 7, '竹木高腳屋', 1.4),
  D33: spec(D33, 0, 2, '雙半球大腦', 1.5),
  D34: spec(D34, 9, 3, '展翼和平鴿', 1.6),
  D35: spec(D35, 9, 4, '啟蒙火炬', 1.0),
  D36: spec(D36, 1, 7, '六面永續色塊魔方', 1.05),
  D04: spec(D04, 0, 3, '投票箱與選票', 1.1),
  D05: spec(D05, 1, 8, '四節點社會網絡', 1.7),
  D06: spec(D06, 0, 4, '雙枚方孔古錢', 1.7),
  D07: spec(D07, 1, 5, '三分政策圓盤', 1.25),
  D08: spec(D08, 3, 3, '全測站主機與望遠鏡頭', 1.05),
  D09: spec(D09, 5, 3, '供需交叉與均衡點', 1.45),
  D10: spec(D10, 7, 5, '幾何色帶織架', 1.45),
  D12: spec(D12, 0, 7, '三組帶影線K線', 1.45),
  D13: spec(D13, 2, 12, '五檔木框算盤', 1.8),
  D14: spec(D14, 4, 9, '九柱常態鐘形', 1.6),
  D15: spec(D15, 0, 4, '三層組織金字塔', 1.3),
  D16: spec(D16, 0, 6, '三層資料庫圓筒', 1.05),
  D17: spec(D17, 3, 1, '現金流收腰漏斗', 1.3),
  D18: spec(D18, 1, 2, '紫色保險大傘', 1.8),
});
