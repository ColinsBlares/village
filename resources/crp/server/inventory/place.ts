import type * as mint from 'mint-server';
import type { DbRow } from '../player/session.js';

export type PlaceType = 'Vehicle' | 'Faction' | 'House' | 'Family';

export interface InventoryPlace {
  type: PlaceType;
  sqlId: number;
  items: DbRow[];
}

const places = new WeakMap<mint.Player, InventoryPlace>();

export function getPlace(player: mint.Player): InventoryPlace | null {
  return places.get(player) ?? null;
}

export function setPlace(player: mint.Player, place: InventoryPlace): void {
  places.set(player, place);
}

export function clearPlace(player: mint.Player): void {
  places.delete(player);
}
