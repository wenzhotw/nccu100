/**
 * 戰鬥畫面裡的遊戲製作人 Wenz（正面 Q 版）：深色帽 T、眼鏡、側分頭，手上拿著筆電。
 */
const OUT = '#2a2c4a';

export const wenzSVG = `
<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" aria-label="遊戲製作人 Wenz">
  <ellipse cx="110" cy="184" rx="44" ry="8" fill="rgba(40,60,30,.28)"/>
  <rect x="92" y="148" width="14" height="32" rx="6" fill="#3a4a6b" stroke="${OUT}" stroke-width="3"/>
  <rect x="114" y="148" width="14" height="32" rx="6" fill="#3a4a6b" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="99" cy="182" rx="12" ry="5" fill="#f2f2ee" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="121" cy="182" rx="12" ry="5" fill="#f2f2ee" stroke="${OUT}" stroke-width="3"/>
  <path d="M78 106 Q110 92 142 106 L140 154 L80 154 Z" fill="#2f3446" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M86 102 Q110 120 134 102" fill="none" stroke="#454c61" stroke-width="8"/>
  <path d="M104 112 L102 132 M116 112 L118 132" stroke="#e6e6e0" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="96" y="134" width="28" height="12" rx="4" fill="#454c61"/>
  <path d="M80 110 Q66 124 74 138" fill="none" stroke="#2f3446" stroke-width="13" stroke-linecap="round"/>
  <path d="M140 110 Q154 124 146 138" fill="none" stroke="#2f3446" stroke-width="13" stroke-linecap="round"/>
  <g transform="translate(110 140) rotate(-6)">
    <rect x="-34" y="-6" width="68" height="8" rx="2" fill="#c9ced3" stroke="${OUT}" stroke-width="2.5"/>
    <rect x="-30" y="-40" width="60" height="36" rx="3" fill="#dfe4e8" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="0" cy="-22" r="7" fill="#f2c84b"/>
  </g>
  <circle cx="74" cy="140" r="7" fill="#ffe1cc" stroke="${OUT}" stroke-width="2.5"/><circle cx="146" cy="140" r="7" fill="#ffe1cc" stroke="${OUT}" stroke-width="2.5"/>
  <circle cx="110" cy="62" r="38" fill="#ffe1cc" stroke="${OUT}" stroke-width="3"/>
  <path d="M72 64 Q70 22 110 20 Q150 22 148 62 Q138 40 116 40 Q100 44 92 36 Q86 50 72 64 Z" fill="#1c1414" stroke="${OUT}" stroke-width="3"/>
  <g fill="none" stroke="#2a2c4a" stroke-width="3.5"><rect x="85" y="58" width="20" height="16" rx="6"/><rect x="115" y="58" width="20" height="16" rx="6"/><path d="M105 64 H115"/></g>
  <ellipse cx="95" cy="66" rx="4.5" ry="6" fill="#2a1f2b"/><ellipse cx="125" cy="66" rx="4.5" ry="6" fill="#2a1f2b"/>
  <circle cx="97" cy="63" r="1.8" fill="#fff"/><circle cx="127" cy="63" r="1.8" fill="#fff"/>
  <ellipse cx="84" cy="82" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/><ellipse cx="136" cy="82" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/>
  <path d="M100 86 Q110 94 120 86" fill="none" stroke="#6b4636" stroke-width="3" stroke-linecap="round"/>
</svg>`;
