/**
 * WebGL 遺失後保留頁面，等待瀏覽器復原。逾時只提供手動重載，
 * 不自動清掉尚未完成的對話或任務；存檔沿用既有安全位置規則。
 */
export function installContextRecovery(canvas, {
  onLost = () => window.dispatchEvent(new Event('nccu-context-lost')),
  showRecovery = showRecoveryNotice,
  schedule = setTimeout, cancel = clearTimeout,
} = {}) {
  let lost = false, timer = null, dismiss = null;
  function clear() {
    if (timer !== null) cancel(timer);
    timer = null;
    dismiss?.(); dismiss = null;
  }
  function onLostEvent(event) {
    event.preventDefault();
    if (lost) return;
    lost = true;
    onLost();
    timer = schedule(() => { timer = null; if (lost) dismiss = showRecovery(); }, 3000);
  }
  function onRestored() { lost = false; clear(); }
  canvas.addEventListener('webglcontextlost', onLostEvent);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return {
    get lost() { return lost; },
    dispose() {
      clear(); lost = false;
      canvas.removeEventListener('webglcontextlost', onLostEvent);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    },
  };
}

function showRecoveryNotice() {
  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'position:fixed;z-index:10000;left:50%;top:20px;transform:translateX(-50%);width:min(90vw,420px);box-sizing:border-box;padding:16px;border:2px solid #2a2c4a;border-radius:12px;background:#f4f4ee;color:#2a2c4a;font:16px/1.6 sans-serif;text-align:center';
  const message = document.createElement('p');
  message.textContent = '3D 畫面暫時中斷，正在等待恢復。你可以繼續等待，或重新載入並從最近存檔繼續；未完成的對話可能需要重來。';
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = '重新載入';
  button.addEventListener('click', () => location.reload());
  // 避免按鈕事件同時傳給遊戲的觸控移動。
  for (const name of ['pointerdown', 'pointerup', 'keydown', 'keyup']) panel.addEventListener(name, e => e.stopPropagation());
  panel.append(message, button); document.body.append(panel);
  return () => panel.remove();
}
