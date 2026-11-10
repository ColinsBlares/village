import type { ClothSet } from '../uniform.js';

export function governmentUniform(character: { gender: number; factionId: number }, index: number): ClothSet {
  let hatParams!: Record<string, unknown>, topParams!: Record<string, unknown>, legsParams!: Record<string, unknown>, feetsParams!: Record<string, unknown>, earsParams!: Record<string, unknown>, tiesParams!: Record<string, unknown>, masksParams!: Record<string, unknown>, glassesParams!: Record<string, unknown>;
          if (character.gender == 0) { // муж.
              hatParams = { // prop 0
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 1,
                  torso: // /clothes 3
                      [11, 11, 12, 11, 11][index],
                  tTexture: [-1, -1, -1, -1, -1][index],
                  variation: // clothes 11
                      [26, 21, 4, 25, 120][index],
                  texture: [0, 0, 3, 0, 0][index],
                  undershirt: // clothes 8
                      [130, 144, 25, 144, 144][index]
              };
              legsParams = { // clothes 4
                  sex: 1,
                  variation: [25, 25, 25, 28, 28][index],
                  texture: [0, 0, 1, 8, 13][index]
              };
              feetsParams = { // clothes 6
                  sex: 1,
                  variation: [20, 20, 20, 21, 21][index],
                  texture: [0, 2, 0, 9, 9][index]
              };
              earsParams = { // prop 2
                  sex: 1,
                  variation: [0, 0, -1, -1, -1][index],
                  texture: [0, 0, -1, -1, -1][index]
              };
              tiesParams = { // clothes 7
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
              };
              masksParams = { // clothes 1
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
              };
              glassesParams = { // prop 1
                  sex: 1,
                  variation: [8, -1, 4, -1, 4][index],
                  texture: [0, -1, 2, -1, 0][index]
              };
          } else {
              hatParams = { // prop 0
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 0,
                  torso: // /clothes 3
                      [0, 0, 1, 1, 1][index],
                  tTexture: [-1, -1, -1, -1, -1][index],
                  variation: // clothes 11
                      [27, 181, 57, 25, 57][index],
                  texture: [0, 0, 0, 2, 2][index],
                  undershirt: // clothes 8
                      [160, 178, 37, 37, 37][index]
              };
              legsParams = { // clothes 4
                  sex: 0,
                  variation: [54, 54, 54, 51, 51][index],
                  texture: [2, 2, 2, 0, 1][index]
              };
              feetsParams = { // clothes 6
                  sex: 0,
                  variation: [29, 29, 29, 20, 23][index],
                  texture: [0, 0, 0, 2, 0][index]
              };
              earsParams = { // prop 2
                  sex: 0,
                  variation: [2, 0, -1, -1, -1][index],
                  texture: [0, 0, -1, -1, -1][index]
              };
              tiesParams = { // clothes 7
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
              };
              masksParams = { // clothes 1
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
              };
              glassesParams = { // prop 1
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1][index]
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
      ears: { itemId: 10, params: earsParams },
      tie: { itemId: 2, params: tiesParams },
      mask: { itemId: 14, params: masksParams },
      glasses: { itemId: 1, params: glassesParams },
    };
}
