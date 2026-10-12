/**
 * 戰鬥畫面的角色圖（SVG）。寶可夢式：對手是正面，主角是背面。
 * 顏色跟 3D 遊戲裡的角色一致（主角見 actors/player.js 的 HC）。
 */

const OUT = '#2a2c4a';

/** 正面的 Q 版學生 */
function person({ x, shirt, pants, hair, bowl, glasses, book }) {
  const hairPath = bowl
    ? `<path d="M${x - 37} ${70} Q${x - 40} ${22} ${x} ${20} Q${x + 40} ${22} ${x + 37} ${70} L${x + 30} ${56} L${x - 30} ${56} Z" fill="${hair}" stroke="${OUT}" stroke-width="3"/>`
    : `<path d="M${x - 37} ${66} Q${x - 38} ${20} ${x + 2} ${19} Q${x + 40} ${22} ${x + 37} ${64} Q${x + 18} ${40} ${x - 10} ${46} Q${x - 26} ${50} ${x - 37} ${66} Z" fill="${hair}" stroke="${OUT}" stroke-width="3"/>`;
  const specs = glasses
    ? `<g fill="none" stroke="${glasses}" stroke-width="3"><circle cx="${x - 13}" cy="66" r="9"/><circle cx="${x + 13}" cy="66" r="9"/><path d="M${x - 4} 66 H${x + 4}"/></g>` : '';
  const bookEl = book
    ? `<g transform="translate(${x + 18} 128) rotate(-8)"><rect x="-13" y="-17" width="26" height="34" rx="3" fill="#2f4f8a" stroke="${OUT}" stroke-width="3"/>
       <path d="M0 -10 V10 M-7 -3 H7" stroke="#f2c94c" stroke-width="3.5" stroke-linecap="round"/></g>` : '';
  return `
  <g>
    <rect x="${x - 15}" y="148" width="12" height="30" rx="5" fill="${pants}" stroke="${OUT}" stroke-width="3"/>
    <rect x="${x + 3}" y="148" width="12" height="30" rx="5" fill="${pants}" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="${x - 9}" cy="180" rx="10" ry="5" fill="#f2f2ee" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="${x + 9}" cy="180" rx="10" ry="5" fill="#f2f2ee" stroke="${OUT}" stroke-width="3"/>
    <path d="M${x - 24} 104 Q${x} 96 ${x + 24} 104 L${x + 22} 152 L${x - 22} 152 Z" fill="${shirt}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x - 23} 108 Q${x - 34} 124 ${x - 30} 140" fill="none" stroke="${shirt}" stroke-width="11" stroke-linecap="round"/>
    <path d="M${x + 23} 108 Q${x + 30} 120 ${x + 22} 130" fill="none" stroke="${shirt}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="${x + 21}" cy="132" r="6" fill="#ffe1cc" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="${x - 30}" cy="142" r="6" fill="#ffe1cc" stroke="${OUT}" stroke-width="2.5"/>
    ${bookEl}
    <circle cx="${x}" cy="62" r="38" fill="#ffe1cc" stroke="${OUT}" stroke-width="3"/>
    ${hairPath}
    <ellipse cx="${x - 13}" cy="68" rx="5" ry="7" fill="#2a1f2b"/><ellipse cx="${x + 13}" cy="68" rx="5" ry="7" fill="#2a1f2b"/>
    <circle cx="${x - 11}" cy="65" r="2" fill="#fff"/><circle cx="${x + 15}" cy="65" r="2" fill="#fff"/>
    ${specs}
    <ellipse cx="${x - 24}" cy="80" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/><ellipse cx="${x + 24}" cy="80" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/>
    <path d="M${x - 8} 84 Q${x} 92 ${x + 8} 84" fill="none" stroke="#6b4636" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

/** 對手：兩人一組的學生傳教士 */
export const enemySVG = `
<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" aria-label="兩位學生傳教士">
  <ellipse cx="150" cy="182" rx="34" ry="7" fill="rgba(40,60,30,.28)"/><ellipse cx="72" cy="182" rx="34" ry="7" fill="rgba(40,60,30,.28)"/>
  <g class="pB">${person({ x: 150, shirt: '#cfe3f5', pants: '#3c4a6b', hair: '#151515', bowl: true, glasses: '#4f545b' })}</g>
  <g class="pA">${person({ x: 72, shirt: '#f7f6f1', pants: '#2e3a5a', hair: '#2a1c18', book: true })}</g>
</svg>`;

/** 主角背面：咖啡色刺刺頭、藍上衣、黃背包 */
export const playerSVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="主角的背影"><g class="pA">
  <path d="M40 200 Q42 132 100 126 Q158 132 160 200 Z" fill="#5aa7e0" stroke="${OUT}" stroke-width="4"/>
  <path d="M70 136 L64 200 M130 136 L136 200" stroke="#cf8f25" stroke-width="9" stroke-linecap="round"/>
  <rect x="62" y="140" width="76" height="66" rx="20" fill="#f2b33d" stroke="${OUT}" stroke-width="4"/>
  <rect x="78" y="160" width="44" height="26" rx="9" fill="#e3b75a" stroke="${OUT}" stroke-width="3"/>
  <circle cx="100" cy="82" r="50" fill="#4a3226" stroke="${OUT}" stroke-width="4"/>
  <path d="M52 70 L40 50 L62 56 L58 30 L78 46 L84 18 L98 40 L112 16 L118 42 L138 26 L136 54 L160 48 L148 70 Z" fill="#4a3226" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M70 60 L80 46 M100 52 L104 36 M126 58 L134 46" stroke="#5d4030" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="50" cy="92" rx="8" ry="11" fill="#ffe1cc" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="150" cy="92" rx="8" ry="11" fill="#ffe1cc" stroke="${OUT}" stroke-width="3"/>
</g></svg>`;

/** 聖靈寶劍 */
export const swordSVG = `
<svg viewBox="0 0 40 140" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 4 L28 96 L12 96 Z" fill="#fff8d6" stroke="#e8b931" stroke-width="3"/>
  <rect x="4" y="94" width="32" height="8" rx="3" fill="#e8b931"/>
  <rect x="16" y="102" width="8" height="26" rx="3" fill="#8a5a2a"/>
  <circle cx="20" cy="132" r="6" fill="#e8b931"/>
</svg>`;

/**
 * 戰鬥背景：指南山、遠方的四維堂、一排樹、紅磚地面（四維道）。
 * viewBox 1600×900，用 preserveAspectRatio="xMidYMid slice" 填滿畫面。
 */
export const fieldSVG = `
<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="btSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset=".7" stop-color="#d9f1ff"/><stop offset="1" stop-color="#f4fbff"/></linearGradient>
    <linearGradient id="btBrick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a58c"/><stop offset="1" stop-color="#cf7a5f"/></linearGradient>
    <pattern id="btTiles" width="80" height="40" patternUnits="userSpaceOnUse"><path d="M0 0 H80 M0 20 H80 M0 0 V20 M40 20 V40" stroke="#b9664e" stroke-width="3" opacity=".45"/></pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#btSky)"/>
  <path d="M0 380 Q160 250 330 320 Q470 200 640 300 Q800 210 960 300 Q1140 190 1300 290 Q1450 240 1600 300 V470 H0 Z" fill="#8cc7a0"/>
  <path d="M0 420 Q200 330 420 390 Q620 320 820 390 Q1040 330 1240 395 Q1420 350 1600 390 V480 H0 Z" fill="#6fb487"/>
  <g transform="translate(250 330)">
    <rect x="0" y="40" width="250" height="110" fill="#f2efe6" stroke="#9aa39a" stroke-width="4"/>
    <rect x="-10" y="28" width="270" height="16" fill="#e1ddd2" stroke="#9aa39a" stroke-width="4"/>
    <rect x="80" y="10" width="90" height="22" fill="#e1ddd2" stroke="#9aa39a" stroke-width="4"/>
    <g fill="#b8c9d2">${[20, 62, 104, 146, 188].map(x => `<rect x="${x}" y="64" width="30" height="70"/>`).join('')}</g>
  </g>
  <g transform="translate(1180 300)">
    <rect x="0" y="40" width="200" height="140" fill="#efe9dc" stroke="#9aa39a" stroke-width="4"/>
    <rect x="-8" y="30" width="216" height="14" fill="#e1ddd2" stroke="#9aa39a" stroke-width="4"/>
    <g fill="#b8c9d2">${[0, 1, 2, 3].map(r => [16, 64, 112, 160].map(x => `<rect x="${x}" y="${58 + r * 30}" width="26" height="18"/>`).join('')).join('')}</g>
  </g>
  <g fill="#4f9a5e" stroke="#2f6a3e" stroke-width="4">${[60, 170, 560, 690, 820, 1000, 1110, 1450, 1540].map((x, i) => `<circle cx="${x}" cy="${445 - (i % 3) * 8}" r="${46 + (i % 2) * 10}"/>`).join('')}</g>
  <rect x="0" y="470" width="1600" height="430" fill="#8fd17a"/>
  <path d="M520 470 L1080 470 L1600 900 L0 900 Z" fill="url(#btBrick)"/>
  <path d="M520 470 L1080 470 L1600 900 L0 900 Z" fill="url(#btTiles)"/>
  <path d="M520 470 L0 900 M1080 470 L1600 900" stroke="#9c9c94" stroke-width="10"/>
</svg>`;
