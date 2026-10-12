/**
 * 戰鬥畫面裡的駐校警察（正面 Q 版），風格跟 systems/battle/sprites.js 的學生一致。
 */
const OUT = '#2a2c4a';

export const copSVG = `
<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" aria-label="駐校警察">
  <ellipse cx="110" cy="184" rx="44" ry="8" fill="rgba(40,60,30,.28)"/>
  <rect x="92" y="148" width="14" height="32" rx="6" fill="#1f2a44" stroke="${OUT}" stroke-width="3"/>
  <rect x="114" y="148" width="14" height="32" rx="6" fill="#1f2a44" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="99" cy="182" rx="12" ry="5" fill="#16181f" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="121" cy="182" rx="12" ry="5" fill="#16181f" stroke="${OUT}" stroke-width="3"/>
  <path d="M80 104 Q110 94 140 104 L140 154 L80 154 Z" fill="#2f4f8a" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <rect x="80" y="140" width="60" height="8" fill="#1a1d26"/>
  <rect x="103" y="139" width="14" height="10" rx="2" fill="#e8c547" stroke="${OUT}" stroke-width="2"/>
  <path d="M92 112 L100 112 L100 122 L92 122 Z" fill="#e8c547" stroke="${OUT}" stroke-width="2"/>
  <path d="M82 108 Q66 124 70 140" fill="none" stroke="#2f4f8a" stroke-width="13" stroke-linecap="round"/>
  <path d="M138 108 Q154 118 150 132" fill="none" stroke="#2f4f8a" stroke-width="13" stroke-linecap="round"/>
  <circle cx="70" cy="143" r="7" fill="#ffe1cc" stroke="${OUT}" stroke-width="2.5"/>
  <g transform="translate(152 128)">
    <circle r="15" fill="#c98a4b" stroke="${OUT}" stroke-width="3"/><circle r="12" fill="#f39ac0"/><circle r="5" fill="#2f4f8a" stroke="${OUT}" stroke-width="2"/>
    <path d="M-6 -7 l3 2 M4 -8 l2 3 M7 3 l-3 1" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </g>
  <circle cx="110" cy="64" r="38" fill="#ffe1cc" stroke="${OUT}" stroke-width="3"/>
  <path d="M74 44 Q110 14 146 44 L146 52 L74 52 Z" fill="#1f2a44" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M70 52 Q110 64 150 52 L150 58 Q110 70 70 58 Z" fill="#14171f" stroke="${OUT}" stroke-width="3"/>
  <path d="M104 30 L110 24 L116 30 L116 40 L104 40 Z" fill="#e8c547" stroke="${OUT}" stroke-width="2"/>
  <ellipse cx="97" cy="72" rx="5" ry="7" fill="#2a1f2b"/><ellipse cx="123" cy="72" rx="5" ry="7" fill="#2a1f2b"/>
  <circle cx="99" cy="69" r="2" fill="#fff"/><circle cx="125" cy="69" r="2" fill="#fff"/>
  <path d="M90 60 L104 63 M130 60 L116 63" stroke="#2a1f2b" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="86" cy="84" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/><ellipse cx="134" cy="84" rx="6" ry="3.5" fill="#f08a8a" opacity=".6"/>
  <path d="M102 90 Q110 86 118 90" fill="none" stroke="#6b4636" stroke-width="3" stroke-linecap="round"/>
</svg>`;
