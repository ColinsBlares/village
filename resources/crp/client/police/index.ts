import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';

let leaderId = 0;
let searchId = 0;

export function installPoliceClient(): void {
  mint.onServer('crp:follow', (id) => {
    leaderId = Number(id) || 0;
  });
  mint.onServer('crp:search', (id) => {
    searchId = Number(id) || 0;
  });
  mint.setInterval(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
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
