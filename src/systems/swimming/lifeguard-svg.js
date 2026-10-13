/**
 * 戰鬥畫面裡的救生員（正面 Q 版），風格跟 systems/battle/sprites.js 的學生一致。
 */
const OUT = '#2a2c4a';

export const lifeguardSVG = `
<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" aria-label="救生員">
  <ellipse cx="110" cy="184" rx="44" ry="8" fill="rgba(40,60,30,.28)"/>
  <rect x="92" y="150" width="14" height="30" rx="6" fill="#ffd9c0" stroke="${OUT}" stroke-width="3"/>
  <rect x="114" y="150" width="14" height="30" rx="6" fill="#ffd9c0" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="99" cy="182" rx="12" ry="5" fill="#2a2c35" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="121" cy="182" rx="12" ry="5" fill="#2a2c35" stroke="${OUT}" stroke-width="3"/>
  <path d="M84 138 L136 138 L134 158 L86 158 Z" fill="#f2f2ee" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M80 104 Q110 94 140 104 L138 142 L82 142 Z" fill="#e8463c" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M100 112 h20 M110 104 v18" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
  <path d="M82 108 Q68 122 72 136" fill="none" stroke="#ffd9c0" stroke-width="12" stroke-linecap="round"/>
  <path d="M138 108 Q150 96 146 84" fill="none" stroke="#ffd9c0" stroke-width="12" stroke-linecap="round"/>
  <circle cx="72" cy="139" r="7" fill="#ffd9c0" stroke="${OUT}" stroke-width="2.5"/>
  <circle cx="146" cy="80" r="7" fill="#ffd9c0" stroke="${OUT}" stroke-width="2.5"/>
  <g transform="translate(150 92) rotate(-20)">
    <circle r="22" fill="none" stroke="#e8463c" stroke-width="10"/>
    <circle r="22" fill="none" stroke="#ffffff" stroke-width="10" stroke-dasharray="17 17"/>
    <circle r="27" fill="none" stroke="${OUT}" stroke-width="2.5"/><circle r="17" fill="none" stroke="${OUT}" stroke-width="2.5"/>
  </g>
  <path d="M96 100 Q110 120 124 100" fill="none" stroke="#f2c84b" stroke-width="2.5"/>
  <rect x="104" y="116" width="12" height="7" rx="3" fill="#cfd5da" stroke="${OUT}" stroke-width="2"/>
  <circle cx="110" cy="64" r="38" fill="#ffd9c0" stroke="${OUT}" stroke-width="3"/>
  <path d="M73 58 Q74 22 110 22 Q146 22 147 58 Q128 40 110 44 Q90 40 73 58 Z" fill="#2a1c18" stroke="${OUT}" stroke-width="3"/>
  <rect x="84" y="62" width="22" height="12" rx="5" fill="#2a2c4a"/><rect x="114" y="62" width="22" height="12" rx="5" fill="#2a2c4a"/>
  <path d="M106 67 H114" stroke="#2a2c4a" stroke-width="3"/>
  <path d="M88 64 h8" stroke="#8fd6ea" stroke-width="2.5" stroke-linecap="round"/><path d="M118 64 h8" stroke="#8fd6ea" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="86" cy="84" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/><ellipse cx="134" cy="84" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/>
  <path d="M100 90 L120 90" stroke="#6b4636" stroke-width="3" stroke-linecap="round"/>
</svg>`;
