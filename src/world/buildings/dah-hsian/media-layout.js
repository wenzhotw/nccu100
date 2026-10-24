/** Official dhl4f.jpg, native crop [2240,550,3040,1830].
 * Seven three-seat pod symbols traced individually, +/-4px. The plan revision
 * and official photo dates are unknown. Finishes use official 4F筆電區 photo;
 * dimensions/heights are game estimates, not a current equipment census.
 */
const symbols=[
 [703,48,[[667,54],[722,16],[726,85]]],
 [565,125,[[552,86],[543,157],[604,132]]],
 [705,190,[[668,198],[720,151],[724,225]]],
 [565,292,[[550,250],[542,326],[605,300]]],
 [707,379,[[670,386],[724,342],[722,415]]],
 [564,464,[[550,424],[543,495],[604,474]]],
 [705,534,[[670,543],[723,500],[726,572]]],
];
export const AV_POD_SYMBOLS=Object.freeze(symbols.map(([u,v,chairs],i)=>Object.freeze({id:`av4-pod-${i}`,native:[u+2240,v+550],chairs:chairs.map(([x,y])=>[x+2240,y+550])})));
export const mediaPoint=(u,v)=>({x:-15+(u-1294.8)*7/334.985156,z:-22+(v-173.46)*7/334.252947});

const banks=[
 [[158,385,[[180,376],[180,398]]],[176,463,[[151,453],[151,475]]],[158,542,[[180,533],[180,555]]],[175,619,[[151,610],[151,631]]]],
 [[302,385,[[279,376],[279,399]]],[286,463,[[311,453],[311,475]]],[302,542,[[279,533],[279,555]]],[286,619,[[311,610],[311,631]]]],
 [[175,976,[[152,965],[152,988]]],[158,1054,[[180,1043],[180,1067]]],[175,1132,[[152,1121],[152,1145]]],[158,1210,[[180,1199],[180,1223]]]],
 [[286,976,[[309,965],[309,988]]],[302,1054,[[279,1043],[279,1067]]],[286,1132,[[309,1121],[309,1145]]],[302,1210,[[279,1199],[279,1223]]]],
];
const nooks=[
 [169,733,[[162,708],[145,726]]],
 [290,735,[[291,761],[313,742]]],
 [168,850,[[144,844],[163,873]]],
 [290,850,[[293,824],[316,843]]],
];
const registered=(list,type,prefix)=>list.map(([u,v,chairs],i)=>({id:`${prefix}-${i}`,type,native:[u+2240,v+550],chairs:chairs.map(([x,y])=>[x+2240,y+550])}));
export const AV_DOUBLE_SYMBOLS=Object.freeze([
 ...banks.flatMap((bank,i)=>registered(bank,'avBench',`av4-bank-${i}`)),
 ...registered(nooks,'avNook','av4-nook'),
]);

// The separate western information-search wing, native crop [0,450,550,1100].
// Screen/chair counts come from symbols; equipment age/model is not asserted.
const search=[
 [165,197,[[135,175],[163,184],[194,176]]],
 [293,180,[[260,203],[290,204],[320,210]]],
 [130,322,[[122,294],[146,293]]],
 [212,303,[[199,346],[225,346]]],
 [294,322,[[282,294],[307,294]]],
 [375,303,[[365,347],[389,347]]],
];
export const AV_SEARCH_SYMBOLS=Object.freeze(search.map(([u,v,chairs],i)=>({id:`pc4-west-${i}`,native:[u,v+450],chairs:chairs.map(([x,y])=>[x,y+450])})));
// 4F21 cabinet outline in the east crop. Height, shelf tiers and DVD colors
// are estimates; the two round ends / connecting bar come from the plan.
export const VIDEO_CABINET={...mediaPoint(2464.5,660),barWidth:4.36,barDepth:.8,endOffset:2.18,endZ:.4,radius:.8,h:1.15};
// Four open 4F17 bays, native crop [1200,500,2250,950]. Plan fixes
// orientations/centres (+/-6px); official 736458107.jpg supports the cream/
// green wraparound sofa, oval low table, TV/low cabinet and beige divider.
// The photo's camera date is 2022-01-20, not a 2026 equipment census.
export const AV_GROUP_SYMBOLS=Object.freeze([
 {id:'av4-group-0',sofa:[1761,710],table:[1793,710],tv:[1844,710],yaw:-Math.PI/2},
 {id:'av4-group-1',sofa:[1951,710],table:[1921,710],tv:[1868,710],yaw:Math.PI/2},
 {id:'av4-group-2',sofa:[1983,710],table:[2015,710],tv:[2064,710],yaw:-Math.PI/2},
 {id:'av4-group-3',sofa:[2176,710],table:[2145,710],tv:[2093,710],yaw:Math.PI/2},
]);
