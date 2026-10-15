/**
 * 商學院。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane, toon } from '../../../render/kit.js';
import { boxC, circC, colliders } from '../../../core/collision.js';
import { lot, stoneMat } from '../../props.js';
import { tree } from '../../vegetation.js';
import { defineBuilding } from '../../registry.js';
import { DOOR, HALL, R, buildInterior, interiorHeight, interiorLight, interiorZone } from './interior.js';

// 這棟建築的位置與尺寸（地圖、碰撞、高度判斷都會用到）
const BZK=0.75, BZA={x:-54,z:-59.7};
const BZ={x:-54,z:-38};

function build() {
  const _bzS=scene.children.length, _bzC=colliders.length;
  /* ---------- 商學院（中正圖書館對面）：米色磁磚高樓、頂部陽台層、紅褐磁磚基座、懸挑雨遮入口 ---------- */
  function bizFacade(bays,nBal,nWin,W,H){ return canvasTex(W,H,(g)=>{
    g.fillStyle='#d8d6d0'; g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(0,0,0,.05)'; g.lineWidth=1; for(let i=0;i<W;i+=8){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,H); g.stroke(); } for(let j=0;j<H;j+=8){ g.beginPath(); g.moveTo(0,j); g.lineTo(W,j); g.stroke(); }
    const nF=nBal+nWin, fh=H/nF, bw=W/bays;
    for(let f=0;f<nF;f++){ const y=f*fh;
      for(let b=0;b<bays;b++){ const x=b*bw;
        if(f<nBal){ g.fillStyle='#6f6a63'; g.fillRect(x+bw*0.06,y+fh*0.12,bw*0.88,fh*0.62);
          g.fillStyle='#8a929a'; for(let k=0;k<3;k++) g.fillRect(x+bw*(0.12+k*0.27),y+fh*0.2,bw*0.22,fh*0.42);
          g.fillStyle='#efe9df'; g.fillRect(x,y+fh*0.74,bw,fh*0.14);
          g.fillStyle='#c9c1b4'; for(let k=0;k<=8;k++) g.fillRect(x+bw*(0.06+k*0.11),y+fh*0.56,2,fh*0.18); g.fillRect(x+bw*0.06,y+fh*0.56,bw*0.88,2);
        } else {
          for(let k=0;k<3;k++){ const wx=x+bw*(0.1+k*0.28), wy=y+fh*0.22, ww=bw*0.22, wh=fh*0.56;
            g.fillStyle='#c4bbad'; g.fillRect(wx-3,wy-3,ww+6,wh+6);
            g.fillStyle='#4d5a64'; g.fillRect(wx,wy,ww,wh);
            g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(wx,wy,ww*0.4,wh);
            g.fillStyle='#c4bbad'; g.fillRect(wx+ww/2-1.5,wy,3,wh); }
        }
      }
      g.fillStyle='#cfc6b8'; g.fillRect(0,y+fh-3,W,3);
    }
    for(let b=0;b<=bays;b++){ const x=b*bw; g.fillStyle='#e8e2d7'; g.fillRect(x-bw*0.04,0,bw*0.08,H); g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(x+bw*0.04,0,3,H); }
  }); }
  function podTex(W,H,reps,glassBay){ return canvasTex(W,H,(g)=>{
    g.fillStyle='#a89890'; g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(80,40,30,.15)'; g.lineWidth=1; for(let i=0;i<W;i+=8){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,H); g.stroke(); } for(let j=0;j<H;j+=8){ g.beginPath(); g.moveTo(0,j); g.lineTo(W,j); g.stroke(); }
    const fh=H/3; for(let f=0;f<3;f++){ const y=f*fh;
      g.fillStyle='#a77d70'; g.fillRect(0,y+fh-6,W,6);
      for(let b=0;b<reps;b++){ const x=b*W/reps, bw=W/reps; g.fillStyle='#4a5a68'; g.fillRect(x+bw*0.12,y+fh*0.22,bw*0.76,fh*0.5); g.fillStyle='#d9cbc0'; for(let k=1;k<4;k++) g.fillRect(x+bw*(0.12+k*0.19),y+fh*0.22,3,fh*0.5); g.fillRect(x+bw*0.12,y+fh*0.45,bw*0.76,3); }
    }
  }); }
  const tmB=t=>new THREE.MeshToonMaterial({map:t,gradientMap:GRAD});
  /* 塔樓 */
  block(BZ.x,25,BZ.z+10,40,30,34,'#d8d6d0',0.08);
  plane(40,30,tmB(bizFacade(8,3,7,1024,1024)),BZ.x,25,BZ.z-7.04,0,Math.PI);
  plane(40,30,tmB(bizFacade(8,3,7,1024,1024)),BZ.x,25,BZ.z+27.04);
  [-1,1].forEach(s=>plane(34,30,tmB(bizFacade(7,3,7,1024,1024)),BZ.x+s*20.04,25,BZ.z+10,0,s*Math.PI/2));
  block(BZ.x,40.3,BZ.z+10,40.8,0.6,34.8,'#cfc6b8',0.04);
  block(BZ.x-8,41.6,BZ.z+14,9,2,8,'#d6cec1',0.03);
  block(BZ.x+10,41.4,BZ.z+6,5,1.6,5,'#d6cec1',0.03);
  { const t=hText('院學商','#c9a24a','900 120px "Noto Serif TC","Songti TC",serif',600,160,90); plane(7,1.6,basic({map:t,transparent:true}),BZ.x,11.6,BZ.z-7.08,0,Math.PI); }
  /* 基座（三層） */
  block(BZ.x,5,BZ.z+11,46,10,44,'#a89890',0.07);
  block(BZ.x,10.15,BZ.z+11,46.4,0.3,44.4,'#a77d70',0.03);
  [-1,1].forEach(s=>{ plane(17,10,tmB(podTex(768,384,4)),BZ.x+s*14.5,5,BZ.z-11.04,0,Math.PI); plane(44,10,tmB(podTex(1024,384,10)),BZ.x+s*23.04,5,BZ.z+11,0,s*Math.PI/2); });
  /* 入口：玻璃帷幕、懸挑雨遮、石材方柱、橫樑 */
  { const gl=canvasTex(512,384,(g,w,h)=>{ const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#3d5d86'); gr.addColorStop(1,'#203247'); g.fillStyle=gr; g.fillRect(0,0,w,h);
      g.fillStyle='rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(0,0); g.lineTo(w*0.5,0); g.lineTo(w*0.2,h); g.lineTo(0,h); g.fill();
      g.fillStyle='#1a1d22'; for(let x=0;x<=w;x+=42) g.fillRect(x-2,0,4,h); for(let y=0;y<=h;y+=48) g.fillRect(0,y-2,w,4);
      g.fillStyle='#2b2f35'; g.fillRect(w/2-70,h-110,140,110); g.fillStyle='#4f6b85'; g.fillRect(w/2-64,h-104,60,104); g.fillRect(w/2+4,h-104,60,104); });
    plane(12,9.2,basic({map:gl}),BZ.x,6,BZ.z-11.06,0,Math.PI); }
  const ENZ=BZ.z-11;
  block(BZ.x,0.7,ENZ-3.6,16.4,1.4,7.2,'#cdc8bf',0.03);
  block(BZ.x,10.6,ENZ-3.8,15,1.0,7.8,'#d8d3ca',0.05);
  { const ceil=canvasTex(256,128,(g,w,h)=>{ g.fillStyle='#ebe7df'; g.fillRect(0,0,w,h); g.strokeStyle='#d6d1c7'; g.lineWidth=2; for(let x=0;x<w;x+=21){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke(); } for(let y=0;y<h;y+=21){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); } g.fillStyle='#fff8e2'; for(let x=20;x<w;x+=42) for(let y=20;y<h;y+=42){ g.beginPath(); g.arc(x,y,4,0,7); g.fill(); } });
    plane(15,7.8,basic({map:ceil}),BZ.x,10.09,ENZ-3.8,Math.PI/2); }
  const PIL='#c7c2b9', PBAND='#8f5d50';
  [-6,-2,2,6].forEach(dx=>{ const x=BZ.x+dx, z=ENZ-6.6;
    block(x,6,z,1.2,9.2,1.2,PIL,0.04);
    for(let y=3.2;y<10;y+=2.4) block(x,y,z,1.24,0.16,1.24,PBAND);
    circC(x,z,0.75); });
  [-6,6].forEach(dx=>block(BZ.x+dx,9.2,ENZ-3.4,1,1,6.2,'#d2cdc4',0.03));
  block(BZ.x,9.2,ENZ-6.6,13.2,1,1,'#d2cdc4',0.03);
  /* 階梯、兩側磁磚矮牆 */
  for(let i=1;i<=7;i++){ const h=1.4-0.2*i; if(h<=0) break; block(BZ.x,h/2,ENZ-7.2-0.5*(i-0.5),16.4,h,0.5,i%2?'#bdb8af':'#c8c3ba',0.01); }
  const tileWall=canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#e7dfcf'; g.fillRect(0,0,w,h); g.strokeStyle='#cfc5b2'; g.lineWidth=2; for(let x=0;x<=w;x+=16){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke(); } for(let y=0;y<=h;y+=16){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); } },[1,1]);
  [-1,1].forEach(s=>{ const x=BZ.x+s*8.6; block(x,0.9,ENZ-5.4,0.8,1.8,10.8,new THREE.MeshToonMaterial({map:tileWall,gradientMap:GRAD}),0.03); boxC(x-0.4,x+0.4,ENZ-10.8,ENZ); });
  flat(18,6,stoneMat(9,3),BZ.x,0.021,ENZ-13.6);
  /* 左側無障礙坡道與磁磚矮牆 */
  { const x0=BZ.x+9, x1=BZ.x+24, zc=ENZ-2.2, len=x1-x0, ang=Math.atan2(1.4,len);
    const rp=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(len,1.4),0.2,3),toon('#b9b6af')); rp.position.set((x0+x1)/2,0.7,zc); rp.rotation.z=ang; rp.receiveShadow=true; scene.add(rp);
    const tw=new THREE.MeshToonMaterial({map:tileWall,gradientMap:GRAD});
    block((x0+x1)/2,1.1,zc-1.8,len,2.2,0.5,tw,0.03); block(x1+0.25,0.6,zc-0.4,0.5,1.2,3.4,tw,0.03);
    boxC(x0,x1+0.5,ENZ-4.1,ENZ); }
  /* 院名石碑 */
  { const sx=BZ.x-13.5, sz=ENZ-12.2;
    block(sx,0.55,sz,8.6,1.1,1.6,new THREE.MeshToonMaterial({map:tileWall,gradientMap:GRAD}),0.03);
    const gran=canvasTex(512,192,(g,w,h)=>{ g.fillStyle='#2a2b2e'; g.fillRect(0,0,w,h); g.strokeStyle='rgba(255,255,255,.08)'; g.lineWidth=2; for(let i=0;i<14;i++){ g.beginPath(); g.moveTo(0,Math.random()*h); g.bezierCurveTo(w*0.3,Math.random()*h,w*0.7,Math.random()*h,w,Math.random()*h); g.stroke(); }
      g.fillStyle='#e9eaec'; g.font='700 27px Georgia,"Noto Serif TC",serif'; g.fillText('College of Commerce',150,136); g.fillText('National Chengchi University',150,170); });
    block(sx,2.2,sz,8,2.2,0.6,'#2a2b2e',0.04);
    plane(7.9,2.15,basic({map:gran}),sx,2.2,sz-0.31,0,Math.PI);
    const plate=canvasTex(640,128,(g,w,h)=>{ const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#e4e5e7'); gr.addColorStop(1,'#a9abb0'); g.fillStyle=gr; g.fillRect(0,0,w,h);
      g.fillStyle='#1e1f22'; g.textBaseline='middle'; const t='國立政治大學商學院'; g.font='900 70px "Noto Serif TC","Songti TC",serif'; const step=(w-60)/(t.length); [...t].forEach((c,i)=>{ const m=g.measureText(c).width; g.fillText(c,30+step*(i+0.5)-m/2,h/2+4); }); });
    plane(6.2,1.0,basic({map:plate}),sx-0.6,2.75,sz-0.33,0,Math.PI);
    const badge=canvasTex(128,128,(g)=>{ g.fillStyle='#f4f4f2'; g.beginPath(); g.arc(64,64,60,0,7); g.fill(); g.strokeStyle='#1f3c8f'; g.lineWidth=4; g.beginPath(); g.arc(64,64,52,0,7); g.stroke(); g.fillStyle='#1f3c8f'; for(let k=0;k<5;k++){ const a=k/5*Math.PI*2-Math.PI/2; g.beginPath(); g.arc(64+Math.cos(a)*16,64+Math.sin(a)*16,12,0,7); g.fill(); } });
    plane(0.9,0.9,basic({map:badge,transparent:true}),sx+3.25,2.75,sz-0.33,0,Math.PI);
    boxC(sx-4.3,sx+4.3,sz-0.8,sz+0.8); }
  [[-40,-61],[-44,-61.5]].forEach(([x,z])=>tree(x,z,1.05));
  boxC(BZ.x-23,BZ.x+23,BZ.z-11,BZ.z+33);
  { const k=BZK, ax=BZA.x, az=BZA.z, g=new THREE.Group(); g.position.set(ax,0,az); g.scale.setScalar(k);
    scene.children.slice(_bzS).forEach(c=>{ c.position.x-=ax; c.position.z-=az; g.add(c); }); scene.add(g);
    colliders.slice(_bzC).forEach(c=>{ if(c.c){ c.x=ax+(c.x-ax)*k; c.z=az+(c.z-az)*k; c.r*=k; } else if(!c.obb){ c.x0=ax+(c.x0-ax)*k; c.x1=ax+(c.x1-ax)*k; c.z0=az+(c.z0-az)*k; c.z1=az+(c.z1-az)*k; } }); }
  lot('風雩樓（福利社）',0,-117,26,18);
  lot('四維網球場',1,-141,24,24);
  lot('八角亭',44,-150,8,8);
}

export default defineBuilding({
  id: 'business-school',
  name: '商學院',
  build,
  // 入口階梯（整棟以 BZA 為基準縮放 BZK 倍）
  heightAt(x, z) {
    if (Math.abs(x - BZA.x) < 8.2 * BZK) {
      const zl = BZA.z + (z - BZA.z) / BZK;
      if (zl <= -49 && zl > -56.2) return 1.4 * BZK;
      if (zl <= -56.2 && zl > -59.7) return BZK * Math.max(0, 1.4 - 0.2 * Math.ceil((-56.2 - zl) / 0.5));
    }
    return null;
  },
  zones: [{ priority: 70, test: p => (p.x < -36 && p.x > -72 && p.z < -17 && p.z > -64) ? '商學院' : null }],
  map: [{ x: -54, z: -27, w: 34, d: 32, color: '#d8cbbb', label: '商學院' }],
  // 一樓內部：挑高大廳 → 長廊 → 穿堂、便利商店 → 用餐區（interior.js，照一樓平面圖）
  interior: {
    id: 'business-1f',
    name: '商學院一樓',
    build: buildInterior,
    light: interiorLight,
    background: '#d6e8f2',
    entrance: { x: -54, z: -52.6, r: 2.8, label: '進入商學院' },     // 入口平台上，玻璃門前
    spawn: { x: DOOR.x, z: DOOR.z - 2.6, yaw: 0, pitch: 0.25, face: Math.PI },
    exit: { x: DOOR.x, z: DOOR.z - 0.7, r: 2.2, label: '離開商學院' },
    returnTo: { x: -54, z: -53.6, yaw: 0, pitch: 0.3, face: Math.PI },
    bounds: { x0: R.x0 + 0.4, x1: R.x1 - 0.4, z0: R.z0 + 0.4, z1: R.z1 - 0.4 },
    camera: { x0: R.x0 + 0.3, x1: R.x1 - 0.3, z0: R.z0 + 0.3, z1: R.z1 - 0.2, ceil: HALL - 0.4, maxDist: 6 },
    heightAt: interiorHeight,
    zone: interiorZone,
  },
});
