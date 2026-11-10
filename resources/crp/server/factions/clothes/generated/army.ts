import type { ClothSet } from '../uniform.js';

export function armyUniform(character: { gender: number; factionId: number }, index: number): ClothSet {
  let hatParams!: Record<string, unknown>, topParams!: Record<string, unknown>, legsParams!: Record<string, unknown>, feetsParams!: Record<string, unknown>, tiesParams!: Record<string, unknown>, masksParams!: Record<string, unknown>, glassesParams!: Record<string, unknown>;
          if (character.gender == 0) { // муж.
              hatParams = { // prop 0
                  sex: 1,
                  variation: [-1, -1, 103, 107, 107, 106, 106, 106, 113, 38, 117][index],
                  texture: [-1, -1, 1, 1, 1, 1, 19, 9, 16, 0, 17][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 1,
                  torso: // /clothes 3
                      [0, 4, 4, 0, 0, 0, 1, 0, 4, 16, 17][index],
                  tTexture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 3][index],
                  variation: // clothes 11
                      [208, 220, 220, 222, 221, 222, 24, 221, 24, 48, 220][index],
                  texture: [3, 3, 1, 1, 1, 1, 1, 9, 1, 0, 9][index],
                  undershirt: // clothes 8
                      [-1, -1, -1, -1, -1, -1, 121, -1, 10, 15, -1][index],
                  uTexture: [-1, -1, -1, -1, -1, -1, 19, -1, 8, -1, -1][index],
              };
              legsParams = { // clothes 4
                  sex: 1,
                  variation: [87, 87, 87, 87, 87, 87, 28, 87, 28, 30, 87][index],
                  texture: [3, 3, 1, 1, 1, 1, 4, 9, 4, 0, 9][index]
              };
              feetsParams = { // clothes 6
                  sex: 1,
                  variation: [25, 25, 25, 35, 35, 35, 21, 35, 21, 63, 35][index],
                  texture: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0][index]
              };
              tiesParams = { // clothes 7
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 33, -1][index],
                  texture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, -1][index]
              };
              masksParams = { // clothes 1
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 122, 104][index],
                  texture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 9][index]
              };
              glassesParams = { // prop 1
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 25][index],
                  texture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 4][index]
              };
          } else {
              hatParams = { // prop 0
                  sex: 0,
                  variation: [-1, -1, 102, -1, 106, 105, 105, 105, 112, 37, 116][index],
                  texture: [-1, -1, 3, -1, 1, 1, 24, 9, 8, 0, 17][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 0,
                  torso: // /clothes 3
                      [14, 14, 14, 14, 14, 14, 1, 4, 1, 17, 18][index],
                  tTexture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 3][index],
                  variation: // clothes 11
                      [224, 230, 230, 232, 231, 231, 24, 222, 24, 41, 230][index],
                  texture: [3, 3, 3, 1, 1, 1, 11, 9, 11, 0, 9][index],
                  undershirt: // clothes 8
                      [-1, -1, -1, -1, -1, -1, 20, -1, 38, 2, -1][index],
                  uTexture: [-1, -1, -1, -1, -1, -1, 1, -1, 8, -1, -1][index],
              };
              legsParams = { // clothes 4
                  sex: 0,
                  variation: [90, 80, 90, 90, 90, 90, 23, 90, 23, 29, 90][index],
                  texture: [3, 3, 3, 1, 1, 1, 5, 9, 5, 0, 9][index]
              };
              feetsParams = { // clothes 6
                  sex: 0,
                  variation: [25, 25, 25, 36, 36, 36, 6, 36, 6, 66, 36][index],
                  texture: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0][index]
              };
              tiesParams = { // clothes 7
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 16, 15][index],
                  texture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 2][index]
              };
              masksParams = { // clothes 1
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 122, 104][index],
                  texture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 9][index]
              };
              glassesParams = { // prop 1
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 27][index],
                  texture: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 4][index]
              };
          }
          
  
    const top = topParams as Record<string, unknown>;
    if (top.undershirt === -1) delete top.undershirt;
    if (top.uTexture === -1) delete top.uTexture;
    if (top.decal === -1) delete top.decal;
    if (top.dTexture === -1) delete top.dTexture;
    if (top.tTexture === -1) delete top.tTexture;
    return {
      hat: { itemId: 6, params: hatParams },
      top: { itemId: 7, params: topParams },
      legs: { itemId: 8, params: legsParams },
      feets: { itemId: 9, params: feetsParams },
      tie: { itemId: 2, params: tiesParams },
      mask: { itemId: 14, params: masksParams },
      glasses: { itemId: 1, params: glassesParams },
    };
}
