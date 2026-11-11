import * as mint from 'mint-client';
import * as native from 'natives';

const ON_MAP = 2;

export function installMapLegend(): void {
  mint.everyTick(() => {
    const map = native.isPauseMenuActive();
    for (const blip of mint.Blip.all) {
      if (!blip.valid) continue;
      if (blip.blipType === 7 || blip.blipType === 10) continue;
      if (!blip.name) continue;
      const id = blip.scriptID;
      if (!id) continue;
      if (native.getBlipInfoIdDisplay(id) === ON_MAP && !map) continue;
      native.setBlipDisplay(id, ON_MAP);
      native.setBlipHiddenOnLegend(id, false);
    }
  });
}
