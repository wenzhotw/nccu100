import * as THREE from 'three';
/** 慢速環境動態只變更視覺，保留碰撞與角色輸入。 */
export function createDahAtmosphere({water,foliage=[]}={}){
 let overlay;
 if(water){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
   uniforms:{time:{value:0},tint:{value:new THREE.Color('#bfd6dc')},strength:{value:.45}},
   vertexShader:'varying vec2 p;varying vec3 viewDirection;varying vec3 waterNormal;void main(){p=position.xy;vec4 world=modelMatrix*vec4(position,1.0);viewDirection=cameraPosition-world.xyz;waterNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}',
   fragmentShader:'uniform float time;uniform float strength;uniform vec3 tint;varying vec2 p;varying vec3 viewDirection;varying vec3 waterNormal;void main(){float wave=sin(p.y*1.8+p.x*.19-time*.38)+sin(p.x*.7-p.y*.4+time*.2)*.45;float fresnel=pow(1.0-abs(dot(normalize(viewDirection),normalize(waterNormal))),2.0);float broad=.8+.2*sin(p.y*.12+p.x*.025+wave*.06);float a=strength*(.3+.7*fresnel)*broad+smoothstep(1.1,1.4,wave)*.04;gl_FragColor=vec4(tint,a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
  });overlay=new THREE.Mesh(water.geometry,material);overlay.name='池面慢速光紋';overlay.userData.noOcc=true;overlay.position.z=.008;water.add(overlay);
 }
 const leaves=foliage.map(mesh=>({mesh,x:mesh.rotation.x,z:mesh.rotation.z}));
 return {update(time,profile,{reducedMotion=false}={}){
  const t=reducedMotion?0:time;
  if(overlay){overlay.material.uniforms.time.value=t;overlay.material.uniforms.strength.value=.45-.13*(profile.night||0);if(profile.sky)overlay.material.uniforms.tint.value.copy(profile.sky);}

  leaves.forEach(({mesh,x,z},i)=>{mesh.rotation.x=x+(reducedMotion?0:Math.sin(t*.55+i*1.7)*.009);mesh.rotation.z=z+(reducedMotion?0:Math.sin(t*.43+i*1.1)*.014);});
 }};
}
