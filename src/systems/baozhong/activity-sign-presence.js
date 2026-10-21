// 看板和帳篷共用進退場時機。離場時實際移除碰撞與互動點，不只隱藏圖形。
export function activitySignPresence({group,marker,spot,box,colliders,spots,state}) {
  let active=false;
  function setActive(on) {
    active=!!on;group.visible=active;if(!active)marker.visible=false;
    for(const [list,item]of [[colliders,box],[spots,spot]]){const i=list.indexOf(item);if(active&&i<0)list.push(item);else if(!active&&i>=0)list.splice(i,1);}
    if(!active&&state.near===spot)state.near=null;
    return active;
  }
  setActive(false);
  return {setActive,get active(){return active;}};
}
