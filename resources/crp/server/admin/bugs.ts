import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { notifySuccess } from '../ui/notify.js';

export function installBugs(): void {
  mint.onClient('crp:bug:create', (player, raw) => {
    let data: { name?: string; steps?: string[]; result?: string; expectedResult?: string } = {};
    try {
      data = JSON.parse(String(raw ?? '{}')) as typeof data;
    } catch {
      return;
    }
    const steps = Array.isArray(data.steps) ? data.steps.map((step, index) => `${index + 1}. ${step}`).join(' | ') : '';
    const name = String(getSession(player).character?.name ?? player.name);
    mint.log(`[BUG] ${name}: ${data.name ?? ''} | ${steps} | ${data.result ?? ''} | ${data.expectedResult ?? ''}`);
    notifySuccess(player, 'Спасибо за участие!', 'Помощь штату');
  });
}
