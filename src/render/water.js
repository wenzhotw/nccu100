/**
 * 水面著色器共用的時間參數。
 */

/* 醉夢溪 */
const waterU={t:{value:0}};
const WV='varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';

export { WV, waterU };
