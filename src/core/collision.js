/**
 * 碰撞：方塊、圓形、旋轉方塊三種碰撞體，以及推開角色的 resolve()。
 */
import { late } from './late.js';

/* ---------- colliders ---------- */
const colliders=[];
let R=0.4;
const boxC=(x0,x1,z0,z1)=>colliders.push({x0,x1,z0,z1});
const circC=(x,z,r)=>colliders.push({c:true,x,z,r});
const obbC=(cx,cz,hx,hz,th)=>colliders.push({obb:true,cx,cz,hx,hz,cs:Math.cos(th),sn:Math.sin(th)});
function resolve(p,rad){ const R0=R; if(rad) R=rad; resolveCore(p); R=R0; }
function resolveCore(p){
  for(const c of colliders){
    if(c.top!==undefined&&p.y>=c.top) continue;
    if(c.obb){ const dx=p.x-c.cx, dz=p.z-c.cz; let lx=dx*c.cs-dz*c.sn, lz=dx*c.sn+dz*c.cs; const nx=Math.max(-c.hx,Math.min(lx,c.hx)), nz=Math.max(-c.hz,Math.min(lz,c.hz)); const ex=lx-nx, ez=lz-nz, d2=ex*ex+ez*ez; if(d2>=R*R) continue;
      if(d2>1e-8){ const d=Math.sqrt(d2); lx=nx+ex/d*R; lz=nz+ez/d*R; } else { const m=[c.hx-lx,lx+c.hx,c.hz-lz,lz+c.hz], mn=Math.min(...m); if(mn===m[0]) lx=c.hx+R; else if(mn===m[1]) lx=-c.hx-R; else if(mn===m[2]) lz=c.hz+R; else lz=-c.hz-R; }
      p.x=c.cx+lx*c.cs+lz*c.sn; p.z=c.cz-lx*c.sn+lz*c.cs; continue; }
    if(c.c){ const dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz), m=c.r+R; if(d<m&&d>1e-4){ p.x=c.x+dx/d*m; p.z=c.z+dz/d*m; } continue; }
    const nx=Math.max(c.x0,Math.min(p.x,c.x1)), nz=Math.max(c.z0,Math.min(p.z,c.z1)), dx=p.x-nx, dz=p.z-nz, d2=dx*dx+dz*dz;
    if(d2>=R*R) continue;
    if(d2>1e-8){ const d=Math.sqrt(d2); p.x=nx+dx/d*R; p.z=nz+dz/d*R; }
    else { const l=p.x-c.x0, r=c.x1-p.x, b=p.z-c.z0, f=c.z1-p.z, mn=Math.min(l,r,b,f);
      if(mn===l)p.x=c.x0-R; else if(mn===r)p.x=c.x1+R; else if(mn===b)p.z=c.z0-R; else p.z=c.z1+R; }
  }
  if(p.x>200){ p.x=Math.max(late.IX-11.2,Math.min(late.IX+11.2,p.x)); p.z=Math.max(-21.4,Math.min(24.3,p.z));
    if(p.z<-17.7&&p.z>-18.4&&Math.abs(p.x-late.IX)>7.9){ p.z=p.z>-18.05?-17.7:-18.4; } }
  else { p.x=Math.max(-245,Math.min(195,p.x)); p.z=Math.max(-230,Math.min(29.5,p.z)); }
}

export { boxC, circC, colliders, obbC, resolve };
