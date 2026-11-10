import * as mint from 'mint-client';
import * as native from 'natives';

function draw(text: string, x: number, y: number, color: [number, number, number, number]): void {
  native.setTextFont(4);
  native.setTextScale(0.4, 0.4);
  native.setTextColour(color[0], color[1], color[2], color[3]);
  native.setTextOutline();
  native.setTextCentre(true);
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(x, y, 0);
}

export function installNametags(): void {
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    const faction = Number(local.getStreamSyncedMeta('crp:faction')) || 0;
    for (const player of mint.Player.streamedIn) {
      if (player === local || !player.valid || player.getStreamSyncedMeta('crp:vanished')) continue;
      const pos = player.pos;
      const dx = pos.x - local.pos.x;
      const dy = pos.y - local.pos.y;
      const dz = pos.z - local.pos.z;
      if (dx * dx + dy * dy + dz * dz > 625) continue;
      const [onScreen, x, y] = native.getScreenCoordFromWorldCoord(pos.x, pos.y, pos.z + 1.05);
      if (!onScreen) continue;
      const same = faction > 0 && faction === (Number(player.getStreamSyncedMeta('crp:faction')) || 0);
      const stored = player.getStreamSyncedMeta('crp:name');
      const label = same && typeof stored === 'string' ? `${stored} (${player.id})` : `ID: ${player.id}`;
      const red = player.getSyncedMeta('crp:redNick') === true;
      draw(label, x, y, red ? [255, 85, 66, 255] : [255, 255, 255, 255]);
    }
  });
}
