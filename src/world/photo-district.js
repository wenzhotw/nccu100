/** 使用者照片街區的範圍，以及由這個街區取代的舊版建築。 */
export const replacedBuildings = new Set(['law-school', 'swimming-hall']);
export const inPhotoDistrict = (x, z) => x > -253 && x < -74 && z > -136 && z < -20;
