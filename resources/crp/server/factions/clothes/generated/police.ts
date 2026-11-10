import type { ClothSet } from '../uniform.js';

export function policeUniform(character: { gender: number; factionId: number }, index: number): ClothSet {
  let hatParams!: Record<string, unknown>, topParams!: Record<string, unknown>, legsParams!: Record<string, unknown>, feetsParams!: Record<string, unknown>, tiesParams!: Record<string, unknown>, masksParams!: Record<string, unknown>, glassesParams!: Record<string, unknown>;
          let f = character.factionId - 2;
          if (character.gender == 0) { // муж.
              hatParams = { // prop 0
                  sex: 1,
                  variation: [
                      [58, 46, 46, -1, -1, 39, 46, 46],
                      [58, 13, 13, 39, 17, 13, 13]
                  ][f][index],
                  texture: [
                      [2, 0, 0, -1, -1, 0, 0, 0],
                      [2, 2, 2, 0, 5, 2, 2]
                  ][f][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 1,
                  torso: [ // /clothes 3
                      [0, 0, 0, 11, 1, 17, 0, 0],
                      [0, 11, 14, 17, 11, 11, 11]
                  ][f][index],
                  tTexture: [
                      [-1, -1, -1, -1, -1, -1, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index],
                  variation: [ // clothes 11
                      [242, 55, 55, 13, 31, 53, 55, 55],
                      [242, 26, 230, 53, 26, 26, 13]
                  ][f][index],
                  texture: [
                      [4, 0, 0, 0, 2, 0, 0, 0],
                      [4, 2, 1, 2, 2, 2, 0]
                  ][f][index],
                  undershirt: [ // clothes 8
                      [122, 58, 58, 130, 31, 130, 122, 130],
                      [122, 58, 27, 130, 58, 122, 130]
                  ][f][index],
                  decal: [ // clothes 10
                      [-1, -1, 8, -1, -1, -1, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index],
                  dTexture: [
                      [-1, -1, 1, -1, -1, -1, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index],
              };
              legsParams = { // clothes 4
                  sex: 1,
                  variation: [
                      [25, 25, 25, 25, 25, 33, 25, 48],
                      [25, 25, 25, 46, 31, 25, 25]
                  ][f][index],
                  texture: [
                      [2, 2, 2, 1, 2, 0, 2, 0],
                      [6, 6, 6, 0, 0, 6, 6]
                  ][f][index]
              };
              feetsParams = { // clothes 6
                  sex: 1,
                  variation: [
                      [25, 25, 25, 10, 10, 25, 25, 25],
                      [25, 25, 25, 25, 25, 25, 25]
                  ][f][index],
                  texture: [
                      [0, 0, 0, 0, 0, 0, 0, 0],
                      [0, 0, 0, 0, 0, 0, 0]
                  ][f][index]
              };
              tiesParams = { // clothes 7
                  sex: 1,
                  variation: [
                      [-1, -1, -1, 38, 38, -1, -1, -1],
                      [-1, -1, -1, -1, -1, 38, 38]
                  ][f][index],
                  texture: [
                      [-1, -1, -1, 0, 6, -1, -1, -1],
                      [-1, -1, -1, -1, -1, 7, 1]
                  ][f][index]
              };
              masksParams = { // clothes 1
                  sex: 1,
                  variation: [
                      [-1, -1, -1, -1, -1, 122, -1, -1],
                      [-1, -1, -1, 122, -1, -1, -1]
                  ][f][index],
                  texture: [
                      [-1, -1, -1, -1, -1, 0, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index]
              };
              glassesParams = { // prop 1
                  sex: 1,
                  variation: [
                      [-1, -1, -1, -1, -1, 15, -1, -1],
                      [-1, -1, -1, 15, 15, -1, -1]
                  ][f][index],
                  texture: [
                      [-1, -1, -1, -1, -1, 9, -1, -1],
                      [-1, -1, -1, 9, 9, -1, -1]
                  ][f][index]
              };
          } else {
              hatParams = { // prop 0
                  sex: 0,
                  variation: [
                      [85, 45, 45, -1, -1, 38, 45, 45],
                      [58, 58, 58, 38, 17, 58, 58]
                  ][f][index],
                  texture: [
                      [2, 0, 0, -1, -1, 0, 0, 0],
                      [2, 0, 0, 2, 5, 0, 0]
                  ][f][index]
              };
              topParams = { // clothes 11 / 3 / 8
                  sex: 0,
                  torso: [ // /clothes 3
                      [14, 14, 14, 0, 3, 18, 14, 14],
                      [14, 0, 0, 18, 0, 0, 0]
                  ][f][index],
                  tTexture: [
                      [-1, -1, -1, -1, -1, -1, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index],
                  variation: [ // clothes 11
                      [250, 48, 48, 27, 57, 46, 48, 48],
                      [250, 27, 240, 46, 27, 27, 27]
                  ][f][index],
                  texture: [
                      [4, 0, 0, 0, 2, 0, 0, 0],
                      [4, 2, 1, 2, 2, 2, 0]
                  ][f][index],
                  undershirt: [ // clothes 8
                      [122, 35, 35, 160, 64, 160, 152, 152],
                      [159, 35, 38, 160, 35, 152, 160]
                  ][f][index]
              };
              legsParams = { // clothes 4
                  sex: 0,
                  variation: [
                      [37, 37, 37, 37, 37, 32, 37, 37],
                      [37, 37, 37, 48, 30, 37, 37]
                  ][f][index],
                  texture: [
                      [2, 2, 2, 0, 2, 0, 1, 1],
                      [6, 6, 6, 0, 0, 6, 6]
                  ][f][index]
              };
              feetsParams = { // clothes 6
                  sex: 0,
                  variation: [
                      [27, 27, 27, 13, 13, 25, 13, 13],
                      [27, 27, 27, 25, 25, 27, 27]
                  ][f][index],
                  texture: [
                      [0, 0, 0, 0, 0, 0, 0, 0],
                      [0, 0, 0, 0, 0, 0, 0]
                  ][f][index]
              };
              tiesParams = { // clothes 7
                  sex: 0,
                  variation: [
                      [-1, -1, -1, -1, -1, -1, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index],
                  texture: [
                      [-1, -1, -1, -1, -1, -1, -1, -1],
                      [-1, -1, -1, -1, -1, -1, -1]
                  ][f][index]
              };
              masksParams = { // clothes 1
                  sex: 0,
                  variation: [
                      [-1, -1, -1, -1, -1, 122, -1, -1],
                      [-1, -1, -1, 122, -1, -1, -1]
                  ][f][index],
                  texture: [
                      [-1, -1, -1, -1, -1, 0, -1, -1],
                      [-1, -1, -1, 0, -1, -1, -1]
                  ][f][index]
              };
              glassesParams = { // prop 1
                  sex: 0,
                  variation: [
                      [-1, -1, -1, -1, -1, 9, -1, -1],
                      [-1, -1, -1, 9, 15, -1, -1]
                  ][f][index],
                  texture: [
                      [-1, -1, -1, -1, -1, 9, -1, -1],
                      [-1, -1, -1, 9, 9, -1, -1]
                  ][f][index]
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
