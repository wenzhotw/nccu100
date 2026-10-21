import { activityEntries, activityBounds } from './activity-map-logic.js';
/** Fixed printed overview, sharing the live map's exact layout source. No player mutation. */
export function signMapModel(layout, content, fountain) {
  const entries = activityEntries(layout, content);
  const bounds = activityBounds(entries, fountain);
  return { entries, bounds, fountain, legend: [...new Map(entries.map(e => [e.college, {name:e.college,color:e.color}])).values()] };
}
export function drawSignMap(ctx, w, h, model) {
  ctx.fillStyle='#f4f4ee';ctx.fillRect(0,0,w,h);
  const {bounds:b}=model, left=40, top=35, mw=w-80, mh=h-190;
  const xy=(x,z)=>[left+(x-b.minX)/(b.maxX-b.minX)*mw,top+(z-b.minZ)/(b.maxZ-b.minZ)*mh];
  ctx.strokeStyle='#b4b8ad';ctx.lineWidth=9;
  const origin=xy(0,b.maxZ),end=xy(0,b.minZ);ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(...end);ctx.stroke();
  ctx.font='700 19px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const e of model.entries){const [x,y]=xy(e.x,e.z);ctx.fillStyle=e.color;ctx.fillRect(x-15,y-12,30,24);ctx.strokeStyle='#24342e';ctx.lineWidth=1;ctx.strokeRect(x-15,y-12,30,24);ctx.fillStyle='#12231b';ctx.fillText(e.id.replace(/^D/,''),x,y);}
  const [fx,fy]=xy(model.fountain.x,model.fountain.z);ctx.fillStyle='#2489b8';ctx.beginPath();ctx.arc(fx,fy,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#24342e';ctx.fillText('噴水池・你在這附近',fx,fy+29);
  ctx.textAlign='left';ctx.font='700 23px sans-serif';
  model.legend.forEach((c,i)=>{const x=40+(i%4)*(w-80)/4,y=h-130+Math.floor(i/4)*36;ctx.fillStyle=c.color;ctx.fillRect(x,y-10,18,18);ctx.fillStyle='#24342e';ctx.fillText(c.name,x+25,y);});
  ctx.textAlign='center';ctx.font='700 24px sans-serif';ctx.fillStyle='#24342e';ctx.fillText('依實際攤位配置繪製｜互動查看完整系名、搜尋與方向',w/2,h-18);
}
