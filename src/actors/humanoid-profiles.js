/** 純資料體型。尺寸與建構順序沿用舊版，不在這批改變肘膝或外觀。 */
const mesh=(geometry,color,position,scale,out,outlineScale)=>({geometry,color,position,scale,out,outlineScale});
export function playerHumanoidProfile(colors){
 return {kind:'player',scale:1,noOcc:false,
  torso:mesh(['capsule',.17,.12,6,16],colors.shirt,[0,.5,0],[1,1,.85],.014),
  bottom:mesh(['cylinder',.172,.18,.13,18],colors.shorts,[0,.36,0],[1,1,.85],.012),
  arm:{pivot:[.19,.63,0],upper:mesh(['capsule',.055,.06,4,10],colors.shirt,[0,-.05,0],null,.012),forearm:mesh(['capsule',.046,.06,4,10],colors.skin,[0,-.14,0],null,.01)},
  leg:{pivot:[.085,.32,0],upper:mesh(['capsule',.06,.08,4,10],colors.skin,[0,-.1,0],null,.01),shoe:mesh(['sphere-unit'],colors.shoe,[0,-.235,.03],[.075,.055,.11],null,1.15),sole:mesh(['box-unit'],colors.sole,[0,-.275,.03],[.13,.022,.2])},
  head:{pivot:[0,.72,0],center:[0,.27,0],skull:mesh(['sphere',.3,32,24],colors.skin,[0,0,0],[1.05,.95,1],null,1.045)}};
}
export function npcHumanoidProfile(look={}){
 const top=look.top||'#5a7fb0',pants=look.pants||'#2f3446',skin=look.skin||'#ffe1cc';
 return {kind:'npc',scale:look.scale||1.2,noOcc:true,
  torso:mesh(['capsule',.18,.16,6,14],top,[0,.52,0],[1,1,.85],.014),
  bottom:mesh(['cylinder',.182,.19,.14,18],pants,[0,.38,0],[1,1,.85],.012),
  arm:{pivot:[.21,.65,0],upper:mesh(['capsule',.052,.08,4,10],top,[0,-.06,0],null,.012),forearm:mesh(['capsule',.046,.06,4,10],look.shortSleeve?skin:top,[0,-.16,0],null,.01),hand:mesh(['sphere-unit'],skin,[0,-.25,0],[.046,.046,.046])},
  leg:{pivot:[.085,.33,0],upper:mesh(['capsule',.06,.09,4,10],pants,[0,-.1,0],null,.01),shoe:mesh(['sphere-unit'],look.shoe||'#2a2a2e',[0,-.24,.03],[.07,.05,.1],null,1.15)},
  head:{pivot:[0,.99,0],center:null,skull:mesh(['sphere',.28,28,20],skin,[0,0,0],[1.05,.97,1],null,1.045)}};
}
