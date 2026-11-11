import * as mint from 'mint-client';
import * as native from 'natives';

interface Spec {
  name: string;
  model: number;
  bone: number;
  offset: [number, number, number];
  rotation: [number, number, number];
  anim: { dict: string; name: string; speed: number; flag: number } | null;
  lost: boolean;
}

interface Live {
  handle: number;
  spec: Spec;
}

const specs = new Map<number, Spec>();
let testHandle = 0;
const objects = new Map<number, Map<number, Live>>();
const pinned = new Set<number>();
let lost = false;

function joaat(text: string): number {
  let hash = 0;
  const value = text.toLowerCase();
  for (let i = 0; i < value.length; i += 1) {
    hash += value.charCodeAt(i);
    hash += hash << 10;
    hash ^= hash >>> 6;
  }
  hash += hash << 3;
  hash ^= hash >>> 11;
  hash += hash << 15;
  return hash >>> 0;
}

function register(
  name: string,
  model: string,
  bone: number,
  offset: [number, number, number],
  rotation: [number, number, number],
  anim: Spec['anim'] = null,
  drop = false,
): void {
  const hash = joaat(name);
  const modelHash = native.getHashKey(model);
  if (specs.has(hash) || !native.isModelInCdimage(modelHash)) return;
  specs.set(hash, { name, model: modelHash, bone, offset, rotation, anim, lost: drop });
}

function playerOf(target: object): mint.Player | null {
  const id = (target as { scriptID?: number }).scriptID ?? -1;
  return mint.Player.getByScriptID(id);
}

function stick(ped: number, handle: number, spec: Spec): void {
  const bone = native.getPedBoneIndex(ped, spec.bone);
  native.attachEntityToEntity(
    handle, ped, bone,
    spec.offset[0], spec.offset[1], spec.offset[2],
    spec.rotation[0], spec.rotation[1], spec.rotation[2],
    false, false, false, false, 2, true, false,
  );
}

function play(ped: number, spec: Spec): void {
  const anim = spec.anim;
  if (!anim || native.isEntityPlayingAnim(ped, anim.dict, anim.name, 3)) return;
  native.requestAnimDict(anim.dict);
  if (!native.hasAnimDictLoaded(anim.dict)) return;
  native.taskPlayAnim(ped, anim.dict, anim.name, anim.speed, 0, -1, anim.flag, 0, false, 0, false);
}

function add(player: mint.Player, hash: number): void {
  const spec = specs.get(hash);
  if (!spec || !player.valid) return;
  const bag = objects.get(player.id) ?? new Map<number, Live>();
  if (bag.has(hash)) return;
  native.requestModel(spec.model);
  if (!native.hasModelLoaded(spec.model)) {
    mint.setTimeout(() => add(player, hash), 50);
    return;
  }
  const handle = native.createObject(spec.model, player.pos.x, player.pos.y, player.pos.z, false, false, false);
  stick(player.scriptID, handle, spec);
  if (spec.anim && !player.vehicle) play(player.scriptID, spec);
  bag.set(hash, { handle, spec });
  objects.set(player.id, bag);
  native.setModelAsNoLongerNeeded(spec.model);
}

function remove(player: mint.Player, hash: number): void {
  const bag = objects.get(player.id);
  const live = bag?.get(hash);
  if (!bag || !live) return;
  bag.delete(hash);
  native.detachEntity(live.handle, true, true);
  native.deleteObject(live.handle);
  if (live.spec.anim && player.valid) {
    native.stopAnimTask(player.scriptID, live.spec.anim.dict, live.spec.anim.name, 1);
    if (player.id === mint.Player.local?.id) native.clearPedSecondaryTask(player.scriptID);
    else native.clearPedTasksImmediately(player.scriptID);
  }
}

function apply(player: mint.Player, raw: string): void {
  const next = raw ? raw.split('|').map((item) => Number.parseInt(item, 36)) : [];
  const bag = objects.get(player.id);
  const local = player.id === mint.Player.local?.id;
  if (bag) {
    for (const hash of bag.keys()) if (!next.includes(hash) && !(local && pinned.has(hash))) remove(player, hash);
  }
  for (const hash of next) if (!bag?.has(hash)) add(player, hash);
  if (local) for (const hash of pinned) add(player, hash);
}

function statics(): void {
  register('takePhone', 'prop_npc_phone', 58867, [0.06, 0.04, 0.01], [-15, 0, -145]);
  register('callPhone', 'prop_npc_phone', 58867, [0.01, 0.05, -0.02], [-5, -65, 165]);
  register('mapCase', 'prop_cs_tablet', 26610, [0.17, -0.042, 0.09], [-3, 153, 170], {
    dict: 'amb@code_human_in_bus_passenger_idles@female@tablet@base', name: 'base', speed: 1, flag: 51,
  });
  register('ammoBox', 'prop_box_ammo04a', 11363, [0.05, 0, -0.25], [-15, 100, 95], {
    dict: 'anim@heists@box_carry@', name: 'idle', speed: 8, flag: 49,
  }, true);
  register('medicinesBox', 'ex_office_swag_pills4', 11363, [0.2, 0, -0.2], [-100, 0, 20], {
    dict: 'anim@heists@box_carry@', name: 'idle', speed: 8, flag: 49,
  }, true);
  register('headBag', 'prop_cs_sack_01', 65068, [0.02, 0, 0], [90, -90, 10]);
  register('farmTrowel', 'prop_cs_trowel', 58867, [0.01, 0.03, 0], [-119, 10, 90], {
    dict: 'amb@world_human_gardener_plant@female@base', name: 'base_female', speed: 8, flag: 1,
  });
  register('farmProductA', 'prop_veg_crop_03_pump', 11363, [0.08, -0.15, -0.25], [-100, 0, 0], {
    dict: 'anim@heists@box_carry@', name: 'idle', speed: 8, flag: 49,
  }, true);
  register('farmProductB', 'prop_veg_crop_03_cab', 11363, [0, -0.05, -0.28], [80, 85, 90], {
    dict: 'anim@heists@box_carry@', name: 'idle', speed: 8, flag: 49,
  }, true);
  register('farmProductC', 'prop_weed_02', 11363, [0, 0, 0.15], [175, 7, 0], {
    dict: 'anim@heists@box_carry@', name: 'idle', speed: 8, flag: 49,
  }, true);
}

export function pinLocal(name: string, on: boolean): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  const hash = joaat(name);
  if (!specs.has(hash)) return;
  if (on) {
    pinned.add(hash);
    add(local, hash);
    return;
  }
  pinned.delete(hash);
  remove(local, hash);
}

export function holding(name: string): boolean {
  const local = mint.Player.local;
  const bag = local ? objects.get(local.id) : undefined;
  if (!bag) return false;
  for (const live of bag.values()) if (live.spec.name === name) return true;
  return false;
}

export function installAttaches(): void {
  statics();
  mint.onServer('crp:attach:catalog', (raw) => {
    if (typeof raw !== 'string') return;
    const rows = JSON.parse(raw) as { id: number; model: string; bone: number; pos: number[]; rot: number[]; gun?: boolean }[];
    for (const row of rows) {
      register(`invItem_${row.id}`, row.model, row.bone, [row.pos[0] ?? 0, row.pos[1] ?? 0, row.pos[2] ?? 0], [row.rot[0] ?? 0, row.rot[1] ?? 0, row.rot[2] ?? 0]);
      if (row.gun) register(`weapon_${row.id}`, row.model, 24818, [0.2, -0.155, -0.1], [13, 180, 10]);
    }
    const local = mint.Player.local;
    if (local?.valid) apply(local, String(local.getStreamSyncedMeta('crp:attach') ?? ''));
    for (const player of mint.Player.streamedIn) apply(player, String(player.getStreamSyncedMeta('crp:attach') ?? ''));
  });
  mint.on('streamSyncedMetaChange', (target, key, value) => {
    if (key !== 'crp:attach') return;
    const player = playerOf(target);
    if (player) apply(player, typeof value === 'string' ? value : '');
  });
  mint.on('worldObjectStreamIn', (object) => {
    const player = playerOf(object);
    if (player) apply(player, String(player.getStreamSyncedMeta('crp:attach') ?? ''));
  });
  mint.on('worldObjectStreamOut', (object) => {
    const player = playerOf(object);
    const bag = player ? objects.get(player.id) : undefined;
    if (!player || !bag) return;
    for (const hash of [...bag.keys()]) remove(player, hash);
  });
  mint.onServer('attaches.test', (model, bone, x, y, z, rx, ry, rz) => {
    const local = mint.Player.local;
    if (!local || typeof model !== 'string') return;
    if (testHandle) native.deleteObject(testHandle);
    const hash = native.getHashKey(model);
    native.requestModel(hash);
    testHandle = native.createObject(hash, local.pos.x, local.pos.y, local.pos.z, false, false, false);
    const index = native.getPedBoneIndex(local.scriptID, Number(bone) || 0);
    native.attachEntityToEntity(testHandle, local.scriptID, index, Number(x) || 0, Number(y) || 0, Number(z) || 0, Number(rx) || 0, Number(ry) || 0, Number(rz) || 0, false, false, false, false, 2, true, false);
  });
  mint.onServer('attaches.testoff', () => {
    if (!testHandle) return;
    native.deleteObject(testHandle);
    testHandle = 0;
  });
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    const bag = objects.get(local.id);
    lost = false;
    if (!bag) return;
    const ped = local.scriptID;
    const falling = native.isPedJumping(ped) || native.isPedShooting(ped) || native.isPedSwimming(ped) || native.isPedFalling(ped);
    for (const [hash, live] of bag) {
      if (!local.vehicle) stick(ped, live.handle, live.spec);
      if (live.spec.anim && !local.vehicle) play(ped, live.spec);
      if (!live.spec.lost) continue;
      lost = true;
      if (local.vehicle || falling) {
        remove(local, hash);
        mint.emitServer('crp:attach:lost', live.spec.name);
      }
    }
    if (!lost) return;
    native.disableControlAction(0, 24, true);
    native.disableControlAction(0, 25, true);
    native.disableControlAction(0, 140, true);
    native.disableControlAction(0, 257, true);
  });
}
