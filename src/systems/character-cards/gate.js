/** 預設關閉；只有單一明確值 1 才啟用，不以 truthy 字串猜測。 */
export function isCardGamePreviewEnabled(search){
 if(typeof search!=='string')return false;
 const values=new URLSearchParams(search).getAll('characterCardsPreview');
 return values.length===1&&values[0]==='1';
}
