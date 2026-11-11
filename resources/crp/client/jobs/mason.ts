import * as mint from 'mint-client';
import * as native from 'natives';
import { holding } from '../attaches/index.js';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

let rock: { x: number; y: number; z: number } | null = null;
let health = 0;
let swing: number | null = null;
let hint = '';

function prompt(name: string): void {
  if (hint === name) return;
  hint = name;
  pushCef(name ? `prompt.showByName(${JSON.stringify(name)});` : 'prompt.hide();');
}

function facing(local: mint.Player): boolean {
  if (!rock) return false;
  const front = native.getOffsetFromEntityInWorldCoords(local.scriptID, 0, 1, rock.z - local.pos.z);
  const here = Math.hypot(local.pos.x - rock.x, local.pos.y - rock.y, local.pos.z - rock.z);
  const ahead = Math.hypot(front.x - rock.x, front.y - rock.y, front.z - rock.z);
  return here > ahead;
}

function stopSwing(send: boolean): void {
  if (swing == null) return;
  mint.clearTimeout(swing);
  swing = null;
  busyRemove('jobProcess');
  if (send) mint.emitServer('crp:mason:stop');
}

function slots(): { x: number; y: number; z: number; rZ: number }[] {
  const local = mint.Player.local;
  if (!local) return [];
  const list: { x: number; y: number; z: number; rZ: number }[] = [];
  for (let i = 0; i < 3; i += 1) {
    const pos = native.getOffsetFromEntityInWorldCoords(local.scriptID, Math.random() * 4 - 2, -Math.random(), 0);
    const [found, ground] = native.getGroundZFor3dCoord(pos.x, pos.y, local.pos.z + 2, null, false, false);
    list.push({ x: pos.x, y: pos.y, z: found ? ground : local.pos.z, rZ: Math.floor(Math.random() * 361) });
  }
  return list;
}

function bar(x: number, y: number): void {
  const fill = health > 50 ? [52, 222, 59, 200] : health > 15 ? [255, 187, 0, 200] : [187, 68, 68, 200];
  native.drawRect(x, y, 0.101, 0.0175, 0, 0, 0, 200, false);
  native.drawRect(x - (100 - health) * 0.0005, y, 0.1 * health / 100, 0.015, fill[0], fill[1], fill[2], fill[3], false);
  native.setTextFont(0);
  native.setTextScale(0.2, 0.2);
  native.setTextColour(255, 255, 255, 255);
  native.setTextCentre(true);
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(`${health}%`);
  native.endTextCommandDisplayText(x, y - 0.02, 0);
}

export function installMason(): void {
  mint.onServer('crp:mason:inside', (x, y, z, value) => {
    rock = { x: Number(x), y: Number(y), z: Number(z) };
    health = Math.max(0, Math.trunc(Number(value) || 0));
  });
  mint.onServer('crp:mason:clear', () => {
    stopSwing(true);
    rock = null;
    health = 0;
    prompt('');
  });
  mint.onServer('crp:mason:health', (value) => {
    health = Math.max(0, Math.trunc(Number(value) || 0));
    if (health <= 0) stopSwing(true);
  });
  mint.onServer('crp:mason:drop', () => {
    mint.emitServer('crp:mason:stones', JSON.stringify(slots()));
  });
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    const pick = holding('invItem_136');
    if (!rock) return;
    if (!pick) {
      if (health > 0) prompt('mason_take_pick');
      return;
    }
    if (health <= 0) {
      prompt('');
      return;
    }
    prompt('mason_start_pick');
    if (!facing(local)) return;
    const [found, ground] = native.getGroundZFor3dCoord(rock.x, rock.y, rock.z + 2, null, false, false);
    try {
      const screen = mint.worldToScreen(rock.x, rock.y, found ? ground : rock.z);
      const size = native.getActualScreenResolution(0, 0);
      const width = size[1];
      const height = size[2];
      if (width > 0 && height > 0) bar(screen.x / width, screen.y / height);
    } catch {
      // Точка за камерой.
    }
    if (!native.isControlJustPressed(0, 24) || native.isPauseMenuActive() || busyHas() || swing != null) return;
    busyAdd('jobProcess', false);
    mint.emitServer('crp:mason:swing');
    swing = mint.setTimeout(() => {
      swing = null;
      busyRemove('jobProcess');
      if (!rock || health <= 0 || !holding('invItem_136')) {
        mint.emitServer('crp:mason:stop');
        return;
      }
      mint.emitServer('crp:mason:hit');
    }, 2000);
  });
}
