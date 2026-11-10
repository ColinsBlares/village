import * as mint from 'mint-client';
import { focusUi, pushCef } from '../cef/view.js';
import { closeInteractionMenu, documentTargetPlayer } from '../interaction/index.js';

interface CarRow {
  id: number;
  plate: string;
}

let carPassList: CarRow[] = [];

function targetPlayer(): mint.Player | null {
  return documentTargetPlayer();
}

export function openDocumentsList(): void {
  closeInteractionMenu();
  focusUi(true);
  pushCef(`interactionMenu.menu = cloneObj(interactionMenu.menus["player_docs"]);
interactionMenu.left = 50;
interactionMenu.show = true;`);
}

export function showDocumentTo(type: string): void {
  const target = targetPlayer();
  if (!target?.valid) {
    pushCef(`notifications.error('Игрок не найден', 'Документы');`);
    return;
  }
  closeInteractionMenu();
  if (type === 'carPass') {
    mint.emitServer('crp:doc:cars');
    return;
  }
  mint.emitServer('crp:doc:offer', type, target.id, '{}');
}

export function offerDocument(type: string, targetId: number, extra: string): void {
  mint.emitServer('crp:doc:offer', type, targetId, extra);
}

export function showCarPassPicker(list: CarRow[]): void {
  carPassList = list;
  if (!list.length) return;
  const lines = [`interactionMenu.left = 50;`, `interactionMenu.menu = cloneObj(interactionMenu.menus["carPass_list"]);`];
  for (const row of list) {
    lines.push(`interactionMenu.menu.items.push({ text: "Т/С: ${row.plate}", icon: "car.png" });`);
  }
  lines.push('interactionMenu.show = true;');
  focusUi(true);
  pushCef(lines.join('\n'));
}

export function chooseCarPass(plate: string): void {
  const target = targetPlayer();
  if (!target?.valid) return;
  const row = carPassList.find((entry) => entry.plate === plate);
  if (!row) return;
  closeInteractionMenu();
  mint.emitServer('crp:doc:offer', 'carPass', target.id, JSON.stringify({ id: row.id }));
}

export function closeDocuments(): void {
  pushCef(`carPass.show = false;
characterPass.show = false;
driverLicense.show = false;
gunLicense.show = false;
medicalCard.show = false;
governmentBadge.show = false;
prompt.hide();`);
}

export function installDocumentsClient(): void {
  mint.onServer('crp:doc:cars', (raw) => {
    if (typeof raw !== 'string') return;
    try {
      const list = JSON.parse(raw) as CarRow[];
      showCarPassPicker(list);
    } catch {
      return;
    }
  });
}
