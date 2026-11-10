import type { ClothSet } from './uniform.js';
import { at } from './uniform.js';

export function hospitalUniform(gender: number, index: number): ClothSet {
  const male = Number(gender) === 0;
  if (male) {
    return {
      hat: { itemId: 6, params: { sex: 1, variation: at([122, 122, 122, 122, -1, -1], index), texture: at([0, 1, 0, 1, -1, -1], index) } },
      top: {
        itemId: 7,
        params: {
          sex: 1,
          torso: at([85, 85, 90, 90, 92, 11], index),
          tTexture: at([-1, -1, -1, -1, -1, -1], index),
          variation: at([250, 250, 249, 249, 13, 25], index),
          texture: at([0, 1, 0, 1, 0, 7], index),
          undershirt: at([129, 129, 74, 74, -1, 144], index),
          uTexture: at([-1, -1, 3, 3, -1, -1], index),
          decal: at([58, 58, 57, 57, -1, -1], index),
          dTexture: at([1, 0, 0, 0, -1, -1], index),
        },
      },
      legs: { itemId: 8, params: { sex: 1, variation: at([96, 96, 96, 96, 96, 96], index), texture: at([0, 1, 0, 1, 1, 1], index) } },
      feets: { itemId: 9, params: { sex: 1, variation: at([51, 51, 51, 51, 10, 10], index), texture: at([0, 0, 0, 0, 0, 0], index) } },
      ears: { itemId: 10, params: { sex: 1, variation: at([-1, -1, -1, -1, -1, -1], index), texture: at([-1, -1, -1, -1, -1, -1], index) } },
      tie: { itemId: 2, params: { sex: 1, variation: at([127, 126, 127, 126, 126, 126], index), texture: at([0, 0, 0, 0, 0, 0], index) } },
      mask: { itemId: 14, params: { sex: 1, variation: at([-1, -1, -1, -1, -1, -1], index), texture: at([-1, -1, -1, -1, -1, -1], index) } },
      glasses: { itemId: 1, params: { sex: 1, variation: at([-1, -1, -1, -1, -1, -1], index), texture: at([-1, -1, -1, -1, -1, -1], index) } },
    };
  }
  return {
    hat: { itemId: 6, params: { sex: 0, variation: at([121, 121, 121, 121, -1, -1], index), texture: at([0, 1, 0, 1, -1, -1], index) } },
    top: {
      itemId: 7,
      params: {
        sex: 0,
        torso: at([109, 109, 104, 104, 98, 98], index),
        tTexture: at([-1, -1, -1, -1, -1, -1], index),
        variation: at([73, 73, 106, 138, 27, 28], index),
        texture: at([1, 1, 2, 9, 0, 5], index),
        undershirt: at([159, 159, 55, 55, -1, 24], index),
        uTexture: at([-1, -1, 6, 6, -1, 0], index),
        decal: at([-1, -1, 65, 65, -1, -1], index),
      },
    },
    legs: { itemId: 8, params: { sex: 0, variation: at([99, 99, 99, 99, 99, 99], index), texture: at([0, 1, 0, 1, 1, 1], index) } },
    feets: { itemId: 9, params: { sex: 0, variation: at([64, 64, 64, 64, 13, 13], index), texture: at([0, 0, 0, 0, 0, 0], index) } },
    ears: { itemId: 10, params: { sex: 0, variation: at([-1, -1, -1, -1, -1, -1], index), texture: at([-1, -1, -1, -1, -1, -1], index) } },
    tie: { itemId: 2, params: { sex: 0, variation: at([97, 96, 97, 96, 96, 96], index), texture: at([0, 0, 0, 0, 0, 0], index) } },
    mask: { itemId: 14, params: { sex: 0, variation: at([-1, -1, -1, -1, -1, -1], index), texture: at([-1, -1, -1, -1, -1, -1], index) } },
    glasses: { itemId: 1, params: { sex: 0, variation: at([-1, -1, -1, -1, -1, -1], index), texture: at([-1, -1, -1, -1, -1, -1], index) } },
  };
}

/** Rage баг: уши получают те же params, что и галстук. */
export function hospitalEarsBug(set: ClothSet): void {
  if (set.ears && set.tie) set.ears.params = { ...set.tie.params, variation: set.ears.params.variation, texture: set.ears.params.texture };
}
