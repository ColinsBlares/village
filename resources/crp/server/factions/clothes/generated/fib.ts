import type { ClothSet } from '../uniform.js';

export function fibUniform(character: { gender: number; factionId: number }, index: number): ClothSet {
  let hatParams!: Record<string, unknown>, topParams!: Record<string, unknown>, legsParams!: Record<string, unknown>, feetsParams!: Record<string, unknown>, earsParams!: Record<string, unknown>, tiesParams!: Record<string, unknown>, masksParams!: Record<string, unknown>, glassesParams!: Record<string, unknown>;
          if (character.gender == 0) { // муж.
              hatParams = { // prop 0
                  sex: 1,
                  variation: [-1, -1, -1, 124, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1, -1][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 1,
                  torso: // /clothes 3
                      [11, 12, 12, 12, 12, 12][index],
                  tTexture: [-1, -1, -1, -1, -1, -1][index],
                  variation: // clothes 11
                      [26, 4, 111, 53, 142, 21][index],
                  texture: [0, 0, 3, 1, 0, 0][index],
                  undershirt: // clothes 8
                      [130, 11, 122, 122, 21, 22][index]
              };
              legsParams = { // clothes 4
                  sex: 1,
                  variation: [24, 28, 24, 24, 24, 24][index],
                  texture: [0, 0, 0, 0, 0, 5][index]
              };
              feetsParams = { // clothes 6
                  sex: 1,
                  variation: [21, 21, 21, 25, 21, 21][index],
                  texture: [7, 7, 0, 0, 0, 0][index]
              };
              earsParams = { // prop 2
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1, -1][index]
              };
              tiesParams = { // clothes 7
                  sex: 1,
                  variation: [128, 125, 125, -1, -1, 125][index],
                  texture: [0, 0, 0, -1, -1, 0][index]
              };
              masksParams = { // clothes 1
                  sex: 1,
                  variation: [-1, -1, -1, 52, -1, -1][index],
                  texture: [-1, -1, -1, 1, -1, -1][index]
              };
              glassesParams = { // prop 1
                  sex: 1,
                  variation: [-1, -1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1, -1][index]
              };
          } else {
              hatParams = { // prop 0
                  sex: 0,
                  variation: [-1, -1, -1, 123, -1, -1][index],
                  texture: [-1, -1, -1, 0, -1, -1][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 0,
                  torso: // /clothes 3
                      [0, 7, 1, 0, 1, 7][index],
                  tTexture: [-1, -1, -1, -1, -1, -1][index],
                  variation: // clothes 11
                      [27, 90, 103, 46, 139, 90][index],
                  texture: [5, 1, 3, 1, 2, 0][index],
                  undershirt: // clothes 8
                      [160, 39, 159, 159, 39, 64][index]
              };
              legsParams = { // clothes 4
                  sex: 0,
                  variation: [37, 51, 54, 30, 51, 51][index],
                  texture: [2, 1, 2, 2, 0, 0][index]
              };
              feetsParams = { // clothes 6
                  sex: 0,
                  variation: [29, 29, 29, 25, 29, 29][index],
                  texture: [0, 1, 0, 0, 1, 2][index]
              };
              earsParams = { // prop 2
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1, -1][index]
              };
              tiesParams = { // clothes 7
                  sex: 0,
                  variation: [98, 95, -1, -1, 95, -1, 95][index],
                  texture: [0, 0, -1, -1, 0, -1, 0][index]
              };
              masksParams = { // clothes 1
                  sex: 0,
                  variation: [-1, -1, -1, 52, -1, -1][index],
                  texture: [-1, -1, -1, 1, -1, -1][index]
              };
              glassesParams = { // prop 1
                  sex: 0,
                  variation: [-1, -1, -1, -1, -1, -1][index],
                  texture: [-1, -1, -1, -1, -1, -1][index]
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
