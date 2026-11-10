import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { factionKind } from '../factions/index.js';
import { notifySuccess, notifyWarning } from '../ui/notify.js';
import { addFuel, vehicleState } from '../vehicles/index.js';
import type { DbRow } from '../player/session.js';

const POS = { x: -2417.09, y: 3310.81, z: 32.83 };
const MAX = 5000;
const STEP = 200;
const HOUR = 60 * 60 * 1000;
let fuel = 500;
const inside = new Set<mint.Player>();

function color(): string {
  const value = fuel / MAX;
  if (value < 0.05) return '~r~';
  if (value < 0.7) return '~y~';
  return '~g~';
}

function pushLabel(): void {
  const text = `${color()}${fuel} ~w~из ~g~${MAX} л\n~w~Нажмите ~b~E~w~`;
  for (const player of inside) {
    if (player.valid) player.emit('crp:army:fuel:label', text);
  }
}

async function save(value: number): Promise<void> {
  fuel = value;
  const row = (await table('EconomicIndicator').findOne({ where: { type: 'army.fuel' } })) as DbRow | null;
  if (row) {
    row.value = value;
    await row.save();
  }
  pushLabel();
}

export async function loadArmyFuel(): Promise<void> {
  const row = (await table('EconomicIndicator').findOne({ where: { type: 'army.fuel' } })) as DbRow | null;
  if (row && Number.isFinite(Number(row.value))) fuel = Number(row.value);
}

export function installArmyFuel(): void {
  new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    POS.x, POS.y, POS.z - 4,
    0, 0, 0, 0, 0, 0,
    4, 4, 4,
    255, 114, 79, 128,
    0,
  );
  const shape = new mint.ColshapeSphere(POS.x, POS.y, POS.z, 4, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      inside.add(player);
      player.emit('crp:army:fuel:enter', true);
      player.emit('crp:army:fuel:label', `${color()}${fuel} ~w~из ~g~${MAX} л\n~w~Нажмите ~b~E~w~`);
    },
    onExit: (player) => {
      inside.delete(player);
      player.emit('crp:army:fuel:enter', false);
    },
  });
  mint.setInterval(() => {
    const next = Math.min(MAX, fuel + STEP);
    if (next !== fuel) void save(next);
  }, HOUR);
  mint.onClient('crp:army:fuel', (player) => {
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!vehicle || !state) return notifyWarning(player, 'Вы не в транспорте');
    if (state.fuel >= state.props.maxFuel) return notifyWarning(player, 'Автомобиль полностью заправлен');
    if (state.key !== 'faction' || factionKind(state.owner) !== 'army') return notifyWarning(player, 'Этот автомобиль нельзя заправить');
    const need = Math.trunc(state.props.maxFuel - state.fuel);
    if (fuel < need) return notifyWarning(player, 'На заправке недостаточно топлива');
    addFuel(vehicle, need);
    void save(Math.max(0, fuel - need));
    notifySuccess(player, `Автомобиль заправлен на ${need} л.`);
  });
}
