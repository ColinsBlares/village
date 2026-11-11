import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

let stamp = '';
let currentId = 0;
let open = false;
let panelStamp = '';
let volumeWait: number | null = null;
let volumeLevel = 100;

const PANEL = `(function(){
if (window.crpMusicPanel) return;
var style = document.createElement('style');
style.textContent = '#crp-music{display:none;position:fixed;right:28px;top:50%;width:380px;transform:translateY(-50%);background:rgba(14,16,18,.94);border:1px solid rgba(230,177,90,.35);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:16px;box-sizing:border-box;color:#f2efe8;font-family:Segoe UI,sans-serif;user-select:none;z-index:40}#crp-music.open{display:block}#crp-music .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}#crp-music .title{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#e6b15a}#crp-music button,#crp-music input{font-family:inherit}#crp-music .x{width:28px;height:28px;border:0;border-radius:8px;background:rgba(255,255,255,.06);color:#f2efe8;cursor:pointer}#crp-music .now{font-size:14px;line-height:1.35;min-height:38px;word-break:break-all}#crp-music .now.empty{color:rgba(242,239,232,.45)}#crp-music .time{display:flex;justify-content:space-between;font-size:12px;color:rgba(242,239,232,.55);margin-top:8px}#crp-music .bar{position:relative;height:6px;margin-top:6px;border-radius:99px;background:rgba(255,255,255,.08);cursor:pointer}#crp-music .bar>i{display:block;height:100%;width:0;border-radius:99px;background:#e6b15a}#crp-music .row,#crp-music .add{display:flex;gap:8px;align-items:center;margin-top:12px}#crp-music button{border:0;border-radius:8px;cursor:pointer;color:#f2efe8;background:rgba(255,255,255,.08)}#crp-music .controls{display:flex;gap:8px}#crp-music .controls button{height:36px;min-width:72px}#crp-music .main{background:#e6b15a;color:#1a140c;font-weight:600}#crp-music .vol{flex:1;display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(242,239,232,.7)}#crp-music .vol input{flex:1;accent-color:#e6b15a}#crp-music .add input{flex:1;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.35);color:#f2efe8;padding:0 10px;outline:none}#crp-music .add button{height:36px;padding:0 12px;background:#e6b15a;color:#1a140c;font-weight:600}#crp-music .list{margin-top:12px;max-height:240px;overflow:auto}#crp-music .item{display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,.04)}#crp-music .item.current{background:rgba(230,177,90,.16)}#crp-music .item span{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#crp-music .item button{width:28px;height:28px}#crp-music .empty-list{font-size:13px;color:rgba(242,239,232,.4);padding:8px 0 2px}';
document.head.appendChild(style);
var box = document.createElement('div');
box.id = 'crp-music';
box.innerHTML = '<div class="head"><div class="title">Плеер</div><button class="x" type="button" data-act="close">×</button></div><div class="now empty" data-now>Ничего не играет</div><div class="bar" data-bar><i data-fill></i></div><div class="time"><span data-cur>0:00</span><span data-dur>0:00</span></div><div class="row"><div class="controls"><button type="button" data-act="prev">Назад</button><button type="button" class="main" data-act="next">Дальше</button><button type="button" data-act="stop">Стоп</button></div><label class="vol">громк.<input data-vol type="range" min="0" max="100" value="100"><span data-voln>100</span></label></div><div class="add"><input data-url type="text" placeholder="https://...mp3" maxlength="300"><button type="button" data-act="add">В очередь</button></div><div class="list" data-list></div>';
document.body.appendChild(box);
var state = null;
var dragging = false;
function send(name, value) {
  if (!window.mp || !mp.trigger) return;
  if (value == null) mp.trigger(name);
  else mp.trigger(name, value);
}
function clock(sec) {
  sec = Math.max(0, sec | 0);
  var m = (sec / 60) | 0;
  var s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function label(url) {
  try { return decodeURIComponent(String(url).split('?')[0].split('/').pop() || url); }
  catch (e) { return String(url); }
}
function render() {
  var list = box.querySelector('[data-list]');
  var queue = state && state.queue || [];
  list.innerHTML = '';
  if (!queue.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-list';
    empty.textContent = 'Очередь пустая';
    list.appendChild(empty);
    return;
  }
  queue.forEach(function (url, index) {
    var row = document.createElement('div');
    row.className = 'item' + (state.url === url && state.index === index ? ' current' : '');
    var name = document.createElement('span');
    name.textContent = label(url);
    var play = document.createElement('button');
    play.type = 'button';
    play.textContent = '▶';
    play.setAttribute('data-play', String(index));
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('data-remove', String(index));
    row.appendChild(name);
    row.appendChild(play);
    row.appendChild(remove);
    list.appendChild(row);
  });
}
box.addEventListener('click', function (event) {
  var act = event.target.getAttribute('data-act');
  if (act === 'close') send('audio3d.ui.close');
  else if (act === 'stop') send('audio3d.ui.stop');
  else if (act === 'next') send('audio3d.ui.next');
  else if (act === 'prev') send('audio3d.ui.prev');
  else if (act === 'add') {
    var input = box.querySelector('[data-url]');
    var url = input.value.trim();
    if (!url) return;
    send('audio3d.ui.add', url);
    input.value = '';
  }
  var play = event.target.getAttribute('data-play');
  var remove = event.target.getAttribute('data-remove');
  if (play != null) send('audio3d.ui.play', play);
  if (remove != null) send('audio3d.ui.remove', remove);
  if (event.target.getAttribute('data-bar') != null || event.target.getAttribute('data-fill') != null) {
    var audio = window.crpMusicAudio;
    if (!audio || !isFinite(audio.duration) || !audio.duration || !state || window.crpMusicId !== state.id) return;
    var rect = box.querySelector('[data-bar]').getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    send('audio3d.ui.seek', String(Math.round(audio.duration * ratio)));
  }
});
box.querySelector('[data-url]').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') box.querySelector('[data-act="add"]').click();
});
box.querySelector('[data-vol]').addEventListener('input', function (event) {
  dragging = true;
  box.querySelector('[data-voln]').textContent = event.target.value;
  send('audio3d.ui.volume', event.target.value);
});
box.querySelector('[data-vol]').addEventListener('change', function () { dragging = false; });
setInterval(function () {
  if (!box.classList.contains('open')) return;
  var audio = window.crpMusicAudio;
  var ok = audio && state && window.crpMusicId === state.id && isFinite(audio.duration);
  var time = ok ? audio.currentTime : 0;
  var duration = ok ? audio.duration : 0;
  box.querySelector('[data-cur]').textContent = clock(time);
  box.querySelector('[data-dur]').textContent = duration ? clock(duration) : '0:00';
  box.querySelector('[data-fill]').style.width = duration ? Math.min(100, time / duration * 100) + '%' : '0';
}, 250);
window.crpMusicPanel = {
  show: function (next) {
    var same = state && JSON.stringify(state.queue) === JSON.stringify(next.queue) && state.index === next.index && state.url === next.url;
    state = next;
    box.classList.add('open');
    var now = box.querySelector('[data-now]');
    if (next.url) { now.textContent = label(next.url); now.classList.remove('empty'); }
    else { now.textContent = 'Ничего не играет'; now.classList.add('empty'); }
    if (!dragging) {
      box.querySelector('[data-vol]').value = next.volume;
      box.querySelector('[data-voln]').textContent = next.volume;
    }
    if (!same) render();
  },
  hide: function () { box.classList.remove('open'); }
};
})();`;

function textOf(vehicle: mint.Vehicle, key: string): string {
  const value = vehicle.getStreamSyncedMeta(key);
  return typeof value === 'string' ? value : '';
}

function numberOf(vehicle: mint.Vehicle, key: string, fallback: number): number {
  const value = Number(vehicle.getStreamSyncedMeta(key));
  return Number.isFinite(value) ? value : fallback;
}

function level(vehicle: mint.Vehicle): number {
  return Math.max(0, Math.min(100, numberOf(vehicle, 'crp:musicVol', 100))) / 100;
}

function pick(): mint.Vehicle | null {
  const local = mint.Player.local;
  if (!local?.valid) return null;
  const own = local.vehicle;
  if (own?.valid && textOf(own, 'crp:musicUrl')) return own;
  let best: mint.Vehicle | null = null;
  let gap = 40;
  for (const vehicle of mint.Vehicle.streamedIn) {
    if (!vehicle.valid || !textOf(vehicle, 'crp:musicUrl')) continue;
    const next = local.pos.distanceTo(vehicle.pos);
    if (next < gap) {
      gap = next;
      best = vehicle;
    }
  }
  return best;
}

function volume(vehicle: mint.Vehicle): number {
  const local = mint.Player.local;
  const gain = level(vehicle);
  if (local?.vehicle === vehicle) return gain;
  const dist = local ? local.pos.distanceTo(vehicle.pos) : 40;
  return gain * Math.max(0, 1 - dist / 40);
}

function play(vehicle: mint.Vehicle | null): void {
  if (!vehicle) {
    if (!stamp) return;
    stamp = '';
    currentId = 0;
    pushCef('if (window.crpMusicAudio) { crpMusicAudio.pause(); crpMusicAudio.removeAttribute("src"); }');
    return;
  }
  const url = textOf(vehicle, 'crp:musicUrl');
  const at = numberOf(vehicle, 'crp:musicAt', Date.now());
  const next = `${vehicle.remoteID}|${url}|${at}`;
  const vol = volume(vehicle);
  if (next === stamp) {
    pushCef(`if (window.crpMusicAudio) crpMusicAudio.volume = ${vol.toFixed(3)};`);
    return;
  }
  stamp = next;
  currentId = vehicle.remoteID;
  const offset = Math.max(0, (Date.now() - at) / 1000);
  pushCef(`(function(){
var a = window.crpMusicAudio || (window.crpMusicAudio = new Audio());
if (!window.crpMusicHook) {
  window.crpMusicHook = true;
  a.onended = function(){ if (window.crpMusicId && window.mp && mp.trigger) mp.trigger('callRemote','vehicles.music.ended', window.crpMusicId); };
  a.onerror = function(){ if (window.notifications && notifications.error) notifications.error('Ссылка не воспроизводится','Музыка'); };
}
window.crpMusicId = ${vehicle.remoteID};
a.src = ${JSON.stringify(url)};
try { a.currentTime = ${offset}; } catch (e) {}
a.volume = ${vol.toFixed(3)};
a.play();
})();`);
}

function driverVehicle(): mint.Vehicle | null {
  const local = mint.Player.local;
  const vehicle = local?.vehicle;
  if (!local?.valid || !vehicle?.valid) return null;
  if (local.seat !== 0 && local.seat !== 1) return null;
  return vehicle;
}

function queueOf(vehicle: mint.Vehicle): string[] {
  try {
    const list = JSON.parse(textOf(vehicle, 'crp:musicQueue') || '[]') as unknown;
    return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function syncPanel(vehicle: mint.Vehicle): void {
  const state = {
    id: vehicle.remoteID,
    queue: queueOf(vehicle),
    index: numberOf(vehicle, 'crp:musicIndex', -1),
    volume: Math.round(level(vehicle) * 100),
    url: textOf(vehicle, 'crp:musicUrl'),
  };
  const next = JSON.stringify(state);
  if (next === panelStamp) return;
  panelStamp = next;
  pushCef(`if (window.crpMusicPanel) crpMusicPanel.show(${next});`);
}

export function closeMusicPanel(): void {
  if (!open) return;
  open = false;
  panelStamp = '';
  pushCef('if (window.crpMusicPanel) crpMusicPanel.hide();');
  busyRemove('music');
}

function openMusicPanel(): void {
  if (native.isPauseMenuActive()) return;
  const local = mint.Player.local;
  if (!local?.valid || !local.vehicle) {
    pushCef(`notifications.error('Нужно быть в машине','Музыка');`);
    return;
  }
  const vehicle = driverVehicle();
  if (!vehicle) {
    pushCef(`notifications.error('Нужно быть за рулём','Музыка');`);
    return;
  }
  if (busyHas() && !busyHas('music')) return;
  if (!open) busyAdd('music');
  open = true;
  pushCef(PANEL);
  panelStamp = '';
  syncPanel(vehicle);
}

export function musicVolume(levelValue: number): void {
  volumeLevel = Math.max(0, Math.min(100, Math.trunc(levelValue) || 0));
  if (volumeWait != null) return;
  volumeWait = mint.setTimeout(() => {
    volumeWait = null;
    if (!open || !driverVehicle()) return;
    mint.emitServer('crp:veh:music:volume', volumeLevel);
  }, 150);
}

export function installVehicleMusic(): void {
  mint.setInterval(() => {
    play(pick());
    if (!open) return;
    const vehicle = driverVehicle();
    if (!vehicle) closeMusicPanel();
    else syncPanel(vehicle);
  }, 250);
  mint.on('keydown', (key) => {
    if (key !== 75) return;
    if (open) closeMusicPanel();
    else openMusicPanel();
  });
  mint.on('leftVehicle', () => closeMusicPanel());
}
