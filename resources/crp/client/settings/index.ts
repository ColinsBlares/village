import * as mint from 'mint-client';
import * as native from 'natives';

function playerOf(target: mint.BaseObject): mint.Player | null {
  if (!('scriptID' in target)) return null;
  return mint.Player.getByScriptID((target as mint.Player).scriptID);
}

async function apply(player: mint.Player): Promise<void> {
  if (!player.valid) return;
  const walk = String(player.getStreamSyncedMeta('crp:walk') ?? '');
  const mood = String(player.getStreamSyncedMeta('crp:mood') ?? '');
  try {
    if (!walk) native.resetPedMovementClipset(player.scriptID, 0);
    else {
      await mint.Utils.requestClipSet(walk);
      if (player.valid) native.setPedMovementClipset(player.scriptID, walk, 0);
    }
    if (!player.valid) return;
    if (!mood) native.clearFacialIdleAnimOverride(player.scriptID);
    else native.setFacialIdleAnimOverride(player.scriptID, mood, null);
  } catch {
    return;
  }
}

export function installSettingsClient(): void {
  mint.on('worldObjectStreamIn', (object) => {
    const player = playerOf(object);
    if (player) void apply(player);
  });
  mint.on('streamSyncedMetaChange', (target, key) => {
    if (key !== 'crp:walk' && key !== 'crp:mood') return;
    const player = playerOf(target);
    if (player) void apply(player);
  });
}
