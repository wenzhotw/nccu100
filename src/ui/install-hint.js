/**
 * 開始畫面的「加到主畫面，全螢幕玩」按鈕與說明。
 *
 * - 只在手機、平板（觸控螢幕）而且「還不是從主畫面打開」時出現；從主畫面打開的就是全螢幕，不再提醒。
 * - Android 的 Chrome 會給安裝事件（beforeinstallprompt），按下去直接跳出系統的安裝視窗。
 * - iPhone、iPad 的 Safari 沒有這個事件，改成跳出圖解：分享 → 加入主畫面。
 * - 直拿手機時，開始畫面下方多一行「橫過來玩比較順」。
 * 主畫面圖示、全螢幕設定在 public/manifest.webmanifest 與 index.html 的 apple-* 標籤。
 */
const $ = id => document.getElementById(id);
const standalone = () => window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const touch = window.matchMedia('(pointer: coarse)').matches;
const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let deferred = null;   // Android 的安裝事件
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });

function showHelp() {
  if ($('installHelp')) return;
  const w = document.createElement('div'); w.id = 'installHelp';
  w.innerHTML = ios
    ? `<div class="sheet" role="dialog" aria-label="加到主畫面">
        <h2>加到主畫面，全螢幕玩</h2>
        <ol>
          <li>用 <b>Safari</b> 打開這個網頁</li>
          <li>點下方（iPad 在上方）的 <span class="share">⇧</span> 分享鍵</li>
          <li>往下滑，選「<b>加入主畫面</b>」，再按「新增」</li>
          <li>回到主畫面，點「蓋亞造界」圖示開始玩</li>
        </ol>
        <p>從主畫面打開會隱藏網址列和工具列，手機橫過來就是全螢幕。</p>
        <button type="button">知道了</button></div>`
    : `<div class="sheet" role="dialog" aria-label="加到主畫面">
        <h2>加到主畫面，全螢幕玩</h2>
        <ol>
          <li>點瀏覽器右上角的 <b>⋮</b> 選單</li>
          <li>選「<b>加到主畫面</b>」或「<b>安裝應用程式</b>」</li>
          <li>回到主畫面，點「蓋亞造界」圖示開始玩</li>
        </ol>
        <p>從主畫面打開會用全螢幕、橫向顯示。</p>
        <button type="button">知道了</button></div>`;
  w.addEventListener('click', e => { if (e.target === w || e.target.tagName === 'BUTTON') w.remove(); });
  document.body.appendChild(w);
}

const go = $('go');
if (go && touch && !standalone()) {
  const btn = document.createElement('button');
  btn.id = 'installBtn'; btn.type = 'button'; btn.textContent = '📲 加到主畫面，全螢幕玩';
  btn.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch { /* 使用者關掉視窗 */ } deferred = null; return; }
    showHelp();
  });
  const tip = document.createElement('div'); tip.className = 'rotate-tip'; tip.textContent = '手機橫過來玩比較順 ↻';
  const card = go.closest('.card');
  // 放在版本號前面；其他系統之後也會在開始鍵後面插按鈕，所以排在卡片尾端比較不會被擠開
  const ver = card && card.querySelector('.ver');
  if (ver) { card.insertBefore(btn, ver); card.insertBefore(tip, ver); } else { go.after(btn); btn.after(tip); }
}

export { standalone };
