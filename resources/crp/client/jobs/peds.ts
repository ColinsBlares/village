import * as mint from 'mint-client';
import * as native from 'natives';

function play(target: object): void {
  const id = (target as { scriptID?: number }).scriptID ?? -1;
  const ped = mint.Ped.getByScriptID(id);
  if (!ped?.valid) return;
  const scenario = ped.getStreamSyncedMeta('crp:scenario');
  if (typeof scenario !== 'string' || !scenario) return;
  native.taskStartScenarioInPlace(ped.scriptID, scenario, 0, false);
}

export function installJobPeds(): void {
  mint.on('worldObjectStreamIn', (object) => play(object));
  mint.on('streamSyncedMetaChange', (target, key) => {
    if (key === 'crp:scenario') play(target);
  });
}
