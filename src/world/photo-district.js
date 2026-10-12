/**
 * 使用者照片街區的範圍，以及由這個街區取代的舊版建築。
 * 法學院和游泳館改回原本的 law-school、swimming-hall 模組（照片比對比較像），
 * 街區裡的這兩棟由 law-education-route 的 SKIP_GROUPS 略過，其他建築照舊。
 */
export const replacedBuildings = new Set();
export const inPhotoDistrict = (x, z) => x > -253 && x < -74 && z > -136 && z < -20;
