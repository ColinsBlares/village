import type { ClothSet } from './uniform.js';
import { at } from './uniform.js';

export function newsUniform(gender: number, index: number): ClothSet {
  const male = Number(gender) === 0;
  if (male) {
    return {
      hat: { itemId: 6, params: { sex: 1, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
      top: {
        itemId: 7,
        params: {
          sex: 1,
          torso: at([12, 11, 4, 6], index),
          tTexture: at([-1, -1, -1, -1], index),
          variation: at([41, 43, 23, 28], index),
          texture: at([3, 0, 1, 2], index),
          undershirt: at([15, 15, 31, 31], index),
        },
      },
      legs: { itemId: 8, params: { sex: 1, variation: at([1, 0, 10, 10], index), texture: at([1, 12, 0, 2], index) } },
      feets: { itemId: 9, params: { sex: 1, variation: at([4, 4, 21, 21], index), texture: at([1, 1, 0, 0], index) } },
      ears: { itemId: 10, params: { sex: 1, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
      tie: { itemId: 2, params: { sex: 1, variation: at([-1, -1, -1, 38], index), texture: at([-1, -1, -1, 10], index) } },
      mask: { itemId: 14, params: { sex: 1, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
      glasses: { itemId: 1, params: { sex: 1, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
    };
  }
  return {
    hat: { itemId: 6, params: { sex: 0, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
    top: {
      itemId: 7,
      params: {
        sex: 0,
        torso: at([0, 0, 3, 1], index),
        tTexture: at([-1, -1, -1, -1], index),
        variation: at([14, 27, 7, 6], index),
        texture: at([2, 5, 0, 2], index),
        undershirt: at([15, 15, 37, 37], index),
      },
    },
    legs: { itemId: 8, params: { sex: 0, variation: at([4, 64, 8, 6], index), texture: at([8, 0, 0, 2], index) } },
    feets: { itemId: 9, params: { sex: 0, variation: at([1, 1, 0, 0], index), texture: at([0, 0, 0, 0], index) } },
    ears: { itemId: 10, params: { sex: 0, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
    tie: { itemId: 2, params: { sex: 0, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
    mask: { itemId: 14, params: { sex: 0, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
    glasses: { itemId: 1, params: { sex: 0, variation: at([-1, -1, -1, -1], index), texture: at([-1, -1, -1, -1], index) } },
  };
}
