/** 互動提示只在內容／顯示狀態改變時寫入 DOM；位置仍由每幀的 placePrompt 更新。 */
export function updateInteraction(button, label, action) {
  const hidden = !action;
  if (action && label.textContent !== action.label) label.textContent = action.label;
  if (button.hidden !== hidden) button.hidden = hidden;
}
export function updatePromptDisplay(prompt, visible) {
  const display = visible ? 'flex' : 'none';
  if (prompt.style.display !== display) prompt.style.display = display;
}
