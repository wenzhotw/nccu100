/** 房間可選的仰視取景；未指定的場景維持原角色中心與最低鏡頭高度。 */
export function frameRoomCamera(camera,target,pitch,config){
 const enabled=!!config?.lookUpHeight;
 camera.position.y=Math.max(.5,camera.position.y);
 const lift=enabled?config.lookUpHeight*Math.max(0,Math.min(1,(.18-pitch)/.23)):0;
 camera.lookAt(target.x,target.y+lift,target.z);
}

/** 先決定真實鏡頭路徑，再交給既有射線退讓；不可在退讓後另抬鏡頭。 */
export function roomOrbitDirection(direction,yaw,pitch,target,distance,config){
 let sy=Math.sin(pitch),cp=Math.cos(pitch);
 if(config?.lookUpHeight){
  sy=Math.max(sy,Math.min(.98,((config.eyeFloor??.5)-target.y)/distance));
  cp=Math.sqrt(Math.max(0,1-sy*sy));
 }
 return direction.set(Math.sin(yaw)*cp,sy,Math.cos(yaw)*cp);
}
