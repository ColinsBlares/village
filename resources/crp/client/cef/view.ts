import * as mint from 'mint-client';

let view: mint.WebView | null = null;
let ready = false;
let open = false;
let gameplay = false;
const queue: string[] = [];
let onMessage: (raw: string) => void = () => {};

export function setMpHandler(handler: (raw: string) => void): void {
  onMessage = handler;
}

function flush(): void {
  const page = view;
  if (!ready || !page?.valid) return;
  while (queue.length > 0) {
    const code = queue.shift();
    if (code) page.emit('cef', code);
  }
}

function ensureView(): void {
  if (view?.valid) return;
  ready = false;
  view = new mint.WebView('http://resource/browser/index.html', true);
  view.isVisible = true;
  view.isModal = !gameplay;
  view.on('cef:ready', () => {
    if (!view?.valid) return;
    ready = true;
    if (!gameplay) view.focused = true;
    flush();
  });
  view.on('mp', (payload) => {
    if (typeof payload === 'string') onMessage(payload);
  });
  if (gameplay) {
    view.focused = false;
    view.inputRegions = [];
  }
}

export function uiFocused(): boolean {
  return view?.valid === true && view.focused;
}

export function inWorld(): boolean {
  return gameplay;
}

export function cefOpen(): boolean {
  return open;
}

export function cefPixels(): { x: number; y: number } | null {
  if (!view?.valid) return null;
  const size = view.size;
  if (!size.x || !size.y) return null;
  return { x: size.x, y: size.y };
}

export function openCef(): void {
  gameplay = false;
  open = true;
  ensureView();
  if (view?.valid) {
    view.isModal = true;
    view.focused = true;
    view.inputRegions = null;
    view.focus();
  }
  mint.showCursor(true);
  mint.toggleGameControls(false);
  flush();
}

export function pushCef(code: string): void {
  ensureView();
  queue.push(code);
  flush();
}

export function focusUi(on: boolean): void {
  if (!view?.valid) return;
  if (on) {
    view.isModal = true;
    view.focused = true;
    view.inputRegions = null;
    view.focus();
    mint.showCursor(true);
    mint.toggleGameControls(false);
    return;
  }
  if (!gameplay) return;
  view.isModal = false;
  view.focused = false;
  view.inputRegions = [];
  view.unfocus();
  mint.showCursor(false);
  mint.toggleGameControls(true);
}

/** Игровой HUD остаётся в том же CEF, курсор и модалка отпускаются. */
export function enterWorldUi(): void {
  gameplay = true;
  open = false;
  if (!view?.valid) return;
  view.isModal = false;
  view.focused = false;
  view.inputRegions = [];
  view.unfocus();
  mint.showCursor(false);
  mint.toggleGameControls(true);
}

export function closeCef(): void {
  open = false;
  gameplay = false;
  ready = false;
  queue.length = 0;
  if (view?.valid) view.destroy();
  view = null;
  mint.showCursor(false);
}
