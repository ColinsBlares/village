import { closePlayerList } from '../hud/players.js';
import { closeChat } from '../chat/index.js';
import { closeMusicPanel } from '../vehicles/music.js';
import { focusUi, inWorld, pushCef } from '../cef/view.js';
import { closeDocuments } from '../documents/index.js';
import { closeInteractionMenu } from '../interaction/index.js';
import { closeMoneyGive } from '../interaction/money.js';
import { busyClear } from './busy.js';

export function releaseUi(): void {
  if (!inWorld()) return;
  closePlayerList();
  closeChat();
  closeMusicPanel();
  closeInteractionMenu();
  closeDocuments();
  closeMoneyGive();
  busyClear();
  pushCef([
    'if (window.inventory) inventory.show = false;',
    'if (window.selectMenu) selectMenu.show = false;',
    'if (window.mapCase) mapCase.show = false;',
    'if (window.playerMenu) playerMenu.show = false;',
    'if (window.phone && phone.show) phone.show = false;',
    'if (window.interactionMenu) interactionMenu.show = false;',
    "if (window.mp && mp.event) mp.event.call('setFocusChat', false);",
  ].join('\n'));
  focusUi(false);
}
