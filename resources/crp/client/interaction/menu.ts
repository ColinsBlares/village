import * as mint from 'mint-client';
import { pushCef } from '../cef/view.js';
import { bootTarget, vehicleTarget } from '../factions/index.js';
import { hasFamiliar } from '../familiar/index.js';
import { inPeace } from '../world/peace.js';
import { closeInteractionMenu, currentInteractionPlayer } from './index.js';

function fail(text: string, header = 'Взаимодействие'): void {
  pushCef(`notifications.error(${JSON.stringify(text)}, ${JSON.stringify(header)});`);
}

function player(): mint.Player | null {
  const target = currentInteractionPlayer();
  if (!target?.valid) {
    fail('Игрок не найден');
    return null;
  }
  return target;
}

function idOf(target: mint.Player): number {
  return target.id;
}

function law(item: string, target: mint.Player): boolean {
  if (item === 'Наручники') mint.emitServer('crp:police:cuffs', idOf(target));
  else if (item === 'Розыск') mint.emitServer('crp:police:wanted', idOf(target));
  else if (item === 'Обыск') mint.emitServer('crp:police:search', idOf(target));
  else if (item === 'Арест') mint.emitServer('crp:police:cell', idOf(target));
  else if (item === 'Освобождение') mint.emitServer('crp:gov:unarrest', idOf(target));
  else if (item === 'Следование') mint.emitServer('crp:police:follow', idOf(target));
  else if (item === 'В авто') mint.emitServer('crp:police:vehicle', idOf(target));
  else if (item === 'Прослушка') mint.emitServer('crp:fib:spy', JSON.stringify({ recId: idOf(target) }));
  else if (item === 'Снять мешок') mint.emitServer('crp:mafia:bag', JSON.stringify({ recId: idOf(target) }));
  else return false;
  return true;
}

export function handleInteractionClick(menu: string, item: string): boolean {
  if (menu === 'player_interaction') {
    const target = player();
    if (!target) return true;
    if (item === 'Познакомиться') {
      if (hasFamiliar(target.name)) {
        fail(`Вы уже знаете ${target.name}`, 'Знакомство');
        return true;
      }
      closeInteractionMenu();
      mint.emitServer('crp:familiar:add', target.id);
      return true;
    }
    if (item === 'Пригласить в семью') {
      closeInteractionMenu();
      mint.emitServer('crp:family:invite', target.id);
      return true;
    }
    return false;
  }

  if (menu === 'faction') {
    const target = player();
    if (!target) return true;
    if (item === 'Пригласить') mint.emitServer('crp:faction:invite', target.id);
    else if (item === 'Уволить') mint.emitServer('crp:faction:uval', target.id);
    else if (item === 'Ранг') mint.emitServer('crp:faction:rank:show', target.id);
    else return false;
    return true;
  }

  if (menu === 'government' || menu === 'police' || menu === 'fib' || menu === 'army') {
    const target = player();
    if (!target) return true;
    return law(item, target);
  }

  if (menu === 'police_gunlicense') {
    const target = player();
    if (!target) return true;
    if (item === 'Выдать') mint.emitServer('crp:police:gun:give', target.id);
    else if (item === 'Изъять') mint.emitServer('crp:police:gun:take', target.id);
    else return false;
    return true;
  }

  if (menu === 'fib_vehicle') {
    const id = vehicleTarget();
    if (!id || item !== 'Номер') return item === 'Номер';
    pushCef(`inputWindow.vehId = ${id}; inputWindow.showByName('fib_veh_plate');`);
    return true;
  }

  if (menu === 'hospital') {
    const target = player();
    if (!target) return true;
    if (item === 'Лечить') mint.emitServer('crp:hospital:heal', target.id);
    else if (item === 'Реанимировать') mint.emitServer('crp:item:adrenalin', JSON.stringify({ recId: target.id }));
    else if (item === 'Медкарта') mint.emitServer('crp:hospital:card', JSON.stringify({ recId: target.id }));
    else return false;
    return true;
  }

  if (menu === 'news' && item === 'Эфир') {
    const target = player();
    if (!target) return true;
    mint.emitServer('crp:news:member', target.id);
    return true;
  }

  if ((menu === 'band' || menu === 'mafia') && item === 'Ограбить') {
    if (inPeace()) return fail('Недоступно в мирной зоне', 'Ограбление'), true;
    const target = player();
    if (!target) return true;
    mint.emitServer('crp:crime:rob', target.id);
    return true;
  }

  if (menu === 'mafia') {
    const target = player();
    if (!target) return true;
    if (item === 'Продать крышу') {
      pushCef(`inputWindow.playerId = ${target.id}; inputWindow.showByName('mafia_power_sell');`);
      return true;
    }
    if (item === 'Связать') mint.emitServer('crp:mafia:cuffs', JSON.stringify({ recId: target.id }));
    else if (item === 'Вести') mint.emitServer('crp:mafia:follow', target.id);
    else if (item === 'Мешок на голову') mint.emitServer('crp:mafia:bag', JSON.stringify({ recId: target.id }));
    else if (item === 'В авто') mint.emitServer('crp:police:vehicle', target.id);
    else return false;
    return true;
  }

  if (menu === 'vehicle' && item === 'Ограбить') {
    if (inPeace()) return fail('Недоступно в мирной зоне'), true;
    const id = vehicleTarget();
    if (!id || bootTarget() !== id) return fail('Необходимо находиться у багажника', 'Ограбление'), true;
    mint.emitServer('crp:crime:vehrob', id);
    return true;
  }

  return false;
}
