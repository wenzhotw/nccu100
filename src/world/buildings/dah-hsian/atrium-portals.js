/** 館方dhl5f原圖西牆雙門與環景5F政大人文庫；位置手動讀圖，非測繪。 */
const x=px=>-15+(px-831.35)*7/333.767969,z=py=>-22+(py-133.14)*7/334.547461;
export const ATRIUM_PORTALS=[{id:'5F-west',floor:'5F',frontId:'print_east_front',axis:'z',x:x(837.5),z:(z(675)+z(744))/2,lo:z(675),hi:z(744),height:2.4,thickness:.1,source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl5f.jpg; native x835..840/y675..744; 2020 official-linked panorama5F'}];
/** 開啟門片朝西，與門框一起供實體及阻擋使用。 */
export function portalParts(p){
 const half=(p.hi-p.lo)/2;
 return[
  ...[p.lo-.05,p.hi+.05].map(z=>({part:'frame',x:p.x,z,w:.18,d:.1,h:p.height})),
  {part:'lintel',x:p.x,z:p.z,w:.18,d:p.hi-p.lo+.2,h:.14,y:p.height+.07},
  ...[p.lo,p.hi].map(z=>({part:'leaf',x:p.x-half/2,z,w:half,d:.055,h:p.height-.08})),
 ];
}
