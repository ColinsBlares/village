import * as mint from 'mint-server';
import { getSession } from '../player/session.js';

type ColshapeHandler = (player: mint.Player) => void;

const enterHandlers = new WeakMap<mint.Colshape, ColshapeHandler>();
const exitHandlers = new WeakMap<mint.Colshape, ColshapeHandler>();

export function setColshapeHandlers(
  colshape: mint.Colshape,
  handlers: { onEnter?: ColshapeHandler; onExit?: ColshapeHandler },
): void {
  if (handlers.onEnter) enterHandlers.set(colshape, handlers.onEnter);
  if (handlers.onExit) exitHandlers.set(colshape, handlers.onExit);
}

function asPlayer(entity: mint.Entity | mint.Pickup): mint.Player | null {
  if (!entity.valid || entity.type !== mint.BaseObjectType.Player) return null;
  return entity as mint.Player;
}

export function installColshapes(): void {
  mint.on('entityEnterColshape', (colshape, entity) => {
    const player = asPlayer(entity);
    if (!player || !getSession(player).character) return;
    enterHandlers.get(colshape)?.(player);
  });

  mint.on('entityLeaveColshape', (colshape, entity) => {
    const player = asPlayer(entity);
    if (!player || !getSession(player).character) return;
    exitHandlers.get(colshape)?.(player);
  });
}
