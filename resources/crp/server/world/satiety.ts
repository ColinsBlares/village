import type * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyWarning } from '../ui/notify.js';

const INTERVAL = 2 * 60 * 1000;
const HEALTH_MIN = 5;
const timers = new Map<number, ReturnType<typeof setInterval>>();

function push(player: mint.Player, satiety: number, thirst: number): void {
  cef(player, `inventory.satiety = ${satiety}; inventory.thirst = ${thirst}; mp.event.call('hud.setData', ${JSON.stringify({ satiety, thirst })});`);
}

export function setNeeds(player: mint.Player, satiety: number, thirst: number): void {
  const character = getSession(player).character;
  if (!character) return;
  const nextSatiety = Math.max(0, Math.min(100, Math.round(satiety)));
  const nextThirst = Math.max(0, Math.min(100, Math.round(thirst)));
  character.satiety = nextSatiety;
  character.thirst = nextThirst;
  void character.save();
  push(player, nextSatiety, nextThirst);
}

function hurt(player: mint.Player, amount: number, emptyText: string, lowText: string): void {
  if (player.health - amount < HEALTH_MIN) return;
  player.health = Math.max(0, player.health - amount);
  if (player.health <= 0) notifyWarning(player, 'Вы умерли!', emptyText);
  else if (player.health < 30) notifyWarning(player, lowText, emptyText);
}

export function startSatiety(player: mint.Player): void {
  stopSatiety(player);
  const characterId = Number(getSession(player).character?.id);
  const id = player.id;
  timers.set(id, setInterval(() => {
    const character = player.valid ? getSession(player).character : null;
    if (!character || Number(character.id) !== characterId) {
      stopSatiety(player);
      return;
    }
    const satiety = Number(character.satiety) || 0;
    const thirst = Number(character.thirst) || 0;
    if (satiety <= 0) hurt(player, 4, 'Голод', 'Вы проголодались! Посетите закусочную или купите что-нибудь из еды!');
    if (thirst <= 0) hurt(player, 2, 'Жажда', 'Вы погибаете! Срочно выпейте напиток!');
    setNeeds(player, satiety - 1, thirst - 1);
  }, INTERVAL));
}

export function stopSatiety(player: mint.Player): void {
  const timer = timers.get(player.id);
  if (timer) clearInterval(timer);
  timers.delete(player.id);
}
