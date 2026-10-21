import { guideProjection } from './activity-guide-model.js';
/** Drawing commands shared by the physical sign and the interactive map. */
export function guideScene(model,w=1200,h=760,{selected=null,matchIds=null,position=model.position}={}) {
 const out=[],add=(type,attrs,text)=>out.push({type,attrs,text});
 const legendH=116,top=56,mapH=h-legendH-top;
 const p=guideProjection(model.bounds,w,mapH,38),xy=(x,z)=>{const q=p.xy(x,z);return [q[0],q[1]+top];};
 const rect=(x,y,width,height,fill,extra={})=>add('rect',{x,y,width,height,fill,...extra});
 const text=(x,y,t,size=20,fill='#243c32',extra={})=>add('text',{x,y,fill,'font-size':size,'font-family':'sans-serif','font-weight':700,'text-anchor':'middle',...extra},t);
 rect(0,0,w,h,'#f8f5e9',{rx:14});rect(0,0,w,46,'#244d3c',{rx:12});text(25,31,'校園活動導覽',24,'#fff9e9',{'text-anchor':'start'});text(w-25,30,'37 學系・3 服務攤',19,'#e6cc79',{'text-anchor':'end'});
 // Broad college bands group actual adjacent booths without moving their positions.
 for(const zone of model.zones){const points=zone.entries.map(e=>xy(e.x,e.z));if(points.length>1)add('polyline',{points:points.map(q=>q.join(',')).join(' '),fill:'none',stroke:zone.color,'stroke-width':22,opacity:.13,'stroke-linecap':'round','stroke-linejoin':'round'});}
 const g=model.gatePlaza,[gx,gy]=xy(g.x+g.width/2,g.z+g.depth/2);rect(gx,gy,g.width*p.scale,g.depth*p.scale,'#dedbc9',{rx:8});
 for(const r of model.roads){const points=r.points.map(q=>xy(...q));add('polyline',{points:points.map(q=>q.join(',')).join(' '),fill:'none',stroke:r.id==='siwei'?'#c88b72':'#c7c5b5','stroke-width':Math.max(8,r.width*p.scale), 'stroke-linecap':'round'});add('polyline',{points:points.map(q=>q.join(',')).join(' '),fill:'none',stroke:'#faf6e6','stroke-width':1.5,'stroke-dasharray':'7 5'});}
 const [sx,sy]=xy(-60,model.roads.find(r=>r.id==='siwei').points[0][1]+.18*36);text(sx,sy+12,'四維道',18,'#663e2d');
 const [bx,by]=xy(45,model.roads.find(r=>r.id==='bade').points.at(-1)[1]);text(bx,by-9,'八德道',17,'#666755');
 const [ax,ay]=xy(0,-47);text(ax+95,ay-12,'中央大道',16,'#5e665c',{'text-anchor':'start'});
 for(const l of model.landmarks){const [x,y]=xy(l.x,l.z);if(l.id==='fountain'){add('circle',{cx:x,cy:y,r:Math.max(12,l.radius*p.scale),fill:'#83c7cc',stroke:'#3b7d86','stroke-width':3});add('circle',{cx:x,cy:y,r:Math.max(6,l.radius*p.scale*.55),fill:'#c1e7df'});text(x,y+6,l.name,18,'#1d4d57');}else{const ww=l.id==='hall'?86:70;rect(x-ww/2,y-17,ww,34,l.id==='hall'?'#d3b984':'#ede0bd',{rx:6,stroke:'#7d7053','stroke-width':2});text(x,y+6,l.name,20);}}
 for(const e of model.entries){const [x,y]=xy(e.x,e.z),isSelected=e.id===selected?.id,muted=matchIds&&!matchIds.has(e.id);rect(x-10,y-10,20,20,e.color,{rx:4,stroke:isSelected?'#f4bd2c':'#ffffff','stroke-width':isSelected?5:1.4,opacity:muted?.2:1,'data-booth-id':e.id});text(x,y+5,e.id.replace(/^D/,''),12,'#ffffff',{'pointer-events':'none',opacity:muted?.2:1});if(isSelected){rect(x-68,y-47,136,27,'#f5c34e',{rx:7,stroke:'#3b422d'});text(x,y-28,`${e.id} ${e.name}`,14,'#253728');}}
 if(position){const [x,y]=xy(position.x,position.z);add('circle',{cx:x,cy:y,r:11,fill:'#d84c39',stroke:'#fff','stroke-width':3});rect(x+12,y-35,95,28,'#d84c39',{rx:7});text(x+60,y-15,'你在這裡',17,'white');}
 // North is the existing game map convention (+z), not a geographic survey claim.
 add('line',{x1:w-38,y1:110,x2:w-38,y2:72,stroke:'#244d3c','stroke-width':3});add('polyline',{points:`${w-46},83 ${w-38},72 ${w-30},83`,fill:'none',stroke:'#244d3c','stroke-width':3});text(w-38,132,'N 北',16);
 add('line',{x1:25,y1:h-legendH,x2:w-25,y2:h-legendH,stroke:'#d8d3be','stroke-width':1});
 model.zones.forEach((z,i)=>{const x=25+i%4*(w-50)/4,y=h-legendH+26+Math.floor(i/4)*27;rect(x,y-12,15,15,z.color,{rx:3});text(x+22,y+1,z.name,16,'#35493b',{'text-anchor':'start'});});
 text(w/2,h-9,'依遊戲實際座標｜攤號對應詳細列表｜點選學系查看位置，不會傳送',13,'#6c7468');
 return out;
}
export function sceneSVG(commands,w,h){const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${commands.map(c=>`<${c.type} ${Object.entries(c.attrs).map(([k,v])=>`${k}="${esc(v)}"`).join(' ')}>${c.text?esc(c.text):''}</${c.type}>`).join('')}</svg>`;}
export function paintGuideScene(ctx,commands){for(const c of commands){const a=c.attrs;ctx.save();ctx.globalAlpha=a.opacity??1;ctx.fillStyle=a.fill||'#000';ctx.strokeStyle=a.stroke||'transparent';ctx.lineWidth=a['stroke-width']||1;ctx.lineCap=a['stroke-linecap']||'butt';if(a['stroke-dasharray'])ctx.setLineDash(a['stroke-dasharray'].split(' ').map(Number));ctx.beginPath();if(c.type==='rect')ctx.rect(a.x,a.y,a.width,a.height);else if(c.type==='circle')ctx.arc(a.cx,a.cy,a.r,0,Math.PI*2);else if(c.type==='line'){ctx.moveTo(a.x1,a.y1);ctx.lineTo(a.x2,a.y2);}else if(c.type==='polyline'){a.points.split(' ').map(p=>p.split(',').map(Number)).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));}else if(c.type==='text'){ctx.font=`${a['font-weight']} ${a['font-size']}px sans-serif`;ctx.textAlign=({'start':'left','end':'right'})[a['text-anchor']]||'center';ctx.fillText(c.text,a.x,a.y);ctx.restore();continue;}if(a.fill&&a.fill!=='none')ctx.fill();if(a.stroke)ctx.stroke();ctx.restore();}}
