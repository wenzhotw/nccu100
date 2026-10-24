/** Native browser walking guard shared with the atrium smoke test. */
// Keep this callback self-contained: Playwright runs it in the browser realm.
export function observeNativeWalk({x,z,arrivalRadius=.12}){
 const game=window.__game,dx=x-game.pos.x,dz=z-game.pos.z,d=Math.hypot(dx,dz);
 game.state.yaw=Math.atan2(-dx,-dz);
 if(d<arrivalRadius){
  dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true}));
  return 'arrived';
 }
 const t=game.state.time,previous=window.__dahSmokeWalk;
 if(!previous||previous.x!==x||previous.z!==z){window.__dahSmokeWalk={x,z,best:d,at:t};return false;}
 if(d<previous.best-.05){previous.best=d;previous.at=t;return false;}
 if(t-previous.at>3){
  dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true}));
  return 'stalled';
 }
 return false;
}
