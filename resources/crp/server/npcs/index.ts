import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';

const near = new WeakMap<mint.Player, DbRow>();

function linesOf(row: DbRow): string[] {
  const lines = String(row.dialog ?? '...').split('|').map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : ['...'];
}

export async function loadNpcs(): Promise<number> {
  const rows = (await table('Npc').findAll()) as DbRow[];
  let count = 0;
  for (const row of rows) {
    if (row.enabled === false || row.enabled === 0) continue;
    const pos = new mint.Vector3(Number(row.x) || 0, Number(row.y) || 0, Number(row.z) || 0);
    const heading = (Number(row.h) || 0) * (Math.PI / 180);
    try {
      const ped = new mint.Ped(String(row.model || 'a_m_y_business_01'), pos, new mint.Vector3(0, 0, heading), 200, true, Number(row.dimension) || 0, true);
      void ped;
    } catch {
      continue;
    }
    const shape = new mint.ColshapeSphere(pos.x, pos.y, pos.z, 2, Number(row.dimension) || 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (row.kind === 'hostile') return;
        near.set(player, row);
        mint.emitClient(player, 'crp:prompt', 'Используйте <span>E</span> для того, чтобы поговорить');
      },
      onExit: (player) => {
        if (near.get(player)?.id !== row.id) return;
        near.delete(player);
        mint.emitClient(player, 'crp:prompt', '');
      },
    });
    if (row.blip === true || row.blip === 1) {
      const blip = new mint.PointBlip(480, pos.x, pos.y, pos.z, 4, 0.7, true, Number(row.dimension) || 0, String(row.name));
      void blip;
    }
    count += 1;
  }
  return count;
}

export function installNpcs(): void {
  mint.onClient('crp:job:use', (player) => {
    const npc = near.get(player);
    if (!npc || !getSession(player).character) return;
    if (player.pos.distanceTo(new mint.Vector3(Number(npc.x), Number(npc.y), Number(npc.z))) > 5) return;
    cef(player, `mp.event.call('questDialog.open', ${JSON.stringify({
      questId: 0,
      npcName: npc.name,
      lines: linesOf(npc),
      choices: [{ handle: 'close', text: 'Понятно' }],
    })});`);
  });

  mint.onClient('crp:npc:talk', (player, rawId) => {
    const npc = near.get(player);
    if (!npc || Number(npc.id) !== Number(rawId)) return;
    cef(player, `mp.event.call('questDialog.open', ${JSON.stringify({
      questId: 0,
      npcName: npc.name,
      lines: linesOf(npc),
      choices: [{ handle: 'close', text: 'Понятно' }],
    })});`);
  });
}
