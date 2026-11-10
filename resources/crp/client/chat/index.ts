import { pushCef } from '../cef/view.js';
import { worldHudOn } from '../hud/index.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

const TAGS = [
  { id: 0, name: 'Сказать', color: '#ffffff' },
  { id: 1, name: 'Крикнуть', color: '#ffdfa8' },
  { id: 3, name: 'НонРП', color: '#c6c695' },
  { id: 4, name: 'Действие', color: '#dd90ff' },
  { id: 5, name: 'Пояснение', color: '#82dbff' },
  { id: 6, name: 'Попытка', color: '#ddff82' },
];

let focused = false;

export function startChat(): void {
  focused = false;
  pushCef(`mp.event.call('setTagsChat', ${JSON.stringify(TAGS)}); mp.event.call('showChat', true); mp.event.call('setOpacityChat', 1); mp.event.call('setTimeChat', true);`);
}

export function openChat(): void {
  if (!worldHudOn() || focused || busyHas()) return;
  focused = true;
  busyAdd('chat');
  pushCef(`mp.event.call('setFocusChat', true);`);
}

export function closeChat(): void {
  if (!focused) return;
  focused = false;
  pushCef(`mp.event.call('setFocusChat', false);`);
  busyRemove('chat');
}

export function showChatLine(text: string): void {
  pushCef(`mp.event.call('pushChatMessage', ${JSON.stringify(text)});`);
}

export function setChatOpacity(value: number): void {
  pushCef(`mp.event.call('setOpacityChat', ${value});`);
}
