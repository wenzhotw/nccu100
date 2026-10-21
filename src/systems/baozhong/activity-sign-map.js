import { activityGuideModel } from './activity-guide-model.js';
import { guideScene, paintGuideScene } from './activity-guide-scene.js';
export function signMapModel(layout,content,fountain){const model=activityGuideModel(layout,content,{x:fountain.x-9.6,z:fountain.z-3.7});return {...model,fountain,legend:model.zones.map(z=>({name:z.name,color:z.color}))};}
export function drawSignMap(ctx,w,h,model){paintGuideScene(ctx,guideScene(model,w,h));}
