import * as mint from 'mint-client';
import { groundPutPos } from '../inventory/ground.js';

function remote(name: string, args: unknown[]): boolean {
  const event = args[1];
  if (event === 'hospital.healing.accept') mint.emitServer('crp:hospital:heal:accept');
  else if (event === 'hospital.healing.cancel') mint.emitServer('crp:hospital:heal:cancel');
  else if (event === 'government.unarrest.accept') mint.emitServer('crp:gov:unarrest:accept');
  else if (event === 'government.unarrest.cancel') mint.emitServer('crp:gov:unarrest:cancel');
  else if (event === 'family.invite.accept') mint.emitServer('crp:family:invite:accept');
  else if (event === 'family.invite.cancel') mint.emitServer('crp:family:invite:cancel');
  else if (event === 'mafia.power.sell') mint.emitServer('crp:mafia:roof', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
  else if (event === 'mafia.power.sell.accept') mint.emitServer('crp:mafia:roof:accept');
  else if (event === 'mafia.power.sell.cancel') mint.emitServer('crp:mafia:roof:cancel');
  else if (event === 'fib.vehicle.plate.set') mint.emitServer('crp:fib:plate', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
  else if (event === 'police.inventory.search.found') mint.emitServer('crp:police:search:found', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
  else if (event === 'police.inventory.search.stop') mint.emitServer('crp:police:search:stop');
  else if (event === 'news.stream') mint.emitServer('crp:news:stream');
  else return false;
  return true;
}

export function handleInteractionBridge(name: string, args: unknown[]): boolean {
  if (name === 'callRemote') return remote(name, args);
  if (name === 'police.inventory.search.item.putGround') {
    const pos = groundPutPos();
    if (pos) mint.emitServer('crp:police:search:drop', Number(args[1]) || 0, pos);
    return true;
  }
  if (name === 'police.inventory.search.stop') {
    mint.emitServer('crp:police:search:stop');
    return true;
  }
  return false;
}
