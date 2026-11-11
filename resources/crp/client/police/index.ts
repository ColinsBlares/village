import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';

let leaderId = 0;
let searchId = 0;
let gate: { id: number; x: number; y: number; z: number } | null = null;

export function installPoliceClient(): void {
  mint.onServer('crp:follow', (id) => {
    leaderId = Number(id) || 0;
    gate = null;
  });
  mint.onServer('crp:marker:follow', (id, x, y, z) => {
    const leader = Number(id) || 0;
    if (!leaderId || leaderId !== leader) return;
    gate = { id: leader, x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 };
  });
  mint.onServer('crp:search', (id) => {
    searchId = Number(id) || 0;
  });
  mint.setInterval(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    if (gate) {
      if (leaderId !== gate.id) gate = null;
      else {
        const gap = local.pos.distanceTo(new mint.Vector3(gate.x, gate.y, gate.z));
        if (gap > 12 || gap < 1.2) gate = null;
        else {
          native.taskFollowNavMeshToCoord(local.scriptID, gate.x, gate.y, gate.z, 1, -1, 1, 1, 0);
          return;
        }
      }
    }
    if (leaderId) {
      const leader = mint.Player.getByID(leaderId);
      if (!leader?.valid || local.pos.distanceTo(leader.pos) > 30) {
        leaderId = 0;
      } else {
        const dist = local.pos.distanceTo(leader.pos);
        const speed = dist < 5 ? 1 : dist < 10 ? 2 : 3;
        native.taskFollowNavMeshToCoord(local.scriptID, leader.pos.x, leader.pos.y, leader.pos.z, speed, -1, 1, 1, 0);
      }
    }
    if (!searchId) return;
    const target = mint.Player.getByID(searchId);
    if (target?.valid && local.pos.distanceTo(target.pos) <= 5) return;
    searchId = 0;
    mint.emitServer('crp:police:search:stop');
    pushCef('inventory.stopSearchMode();');
  }, 400);
}
