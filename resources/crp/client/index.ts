import * as mint from 'mint-client';
import * as native from 'natives';
import { hideLocalPlayer, showPreloadCam, showSelectCam, stopPreloadCam, tickSelectCam } from './camera/index.js';
import { resetDraft } from './cef/draft.js';
import { handleMp, resetSlots } from './cef/events.js';
import { cefOpen, closeCef, enterWorldUi, focusUi, openCef, pushCef, setMpHandler, uiFocused } from './cef/view.js';
import { releaseUi } from './ui/release.js';
import { busyHas } from './ui/busy.js';
import { installHotkeys } from './ui/hotkeys.js';
import { disableWorldHud, enableWorldHud, tickHud } from './hud/index.js';
import { commitRemember, fillRemembered } from './auth/remember.js';
import { installVoiceKeys } from './voice/index.js';
import { openChat, showChatLine, startChat } from './chat/index.js';
import { fadeIn } from './fade/index.js';
import { drawLoading } from './preload/index.js';
import { clearLineup, lineupActive, queueLineup, tickLineup } from './select/lineup.js';
import { installDeathClient, tickDeath } from './death/index.js';
import { installPhoneKeys } from './phone/index.js';
import { installVehicleKeys } from './vehicles/index.js';
import { installOwnVehiclesClient } from './vehicles/own.js';
import { installVehicleSignalKeys, installVehicleSync } from './vehicles/sync.js';
import { installShopKeys } from './shops/index.js';
import { installPlaces } from './places/index.js';
import { installAnticheat } from './anticheat/index.js';
import { installAdmin } from './admin/index.js';
import { installFly } from './admin/fly.js';
import { installPeace } from './world/peace.js';
import { installCarshow } from './carshow/index.js';
import { installNametags } from './nametags/index.js';
import { installFactions } from './factions/index.js';
import { installTuning } from './tuning/index.js';
import { installCarMarket } from './carmarket/index.js';
import { installBootInventory } from './inventory/boot.js';
import { installGroundClient } from './inventory/ground.js';
import { installTradeClient } from './trade/index.js';
import { installDoors } from './world/doors.js';
import { installActivities } from './activities/index.js';
import { installPoliceClient } from './police/index.js';
import { installVehicleCabin } from './vehicles/cabin.js';
import { installInteraction } from './interaction/index.js';
import { installInteractionMoney } from './interaction/money.js';
import { installDocumentsClient } from './documents/index.js';
import { installFamiliarClient } from './familiar/index.js';
import { installSettingsClient } from './settings/index.js';
import { installAfk } from './afk/index.js';
import { installArmyFuel } from './army/fuel.js';
import { installDrunk } from './clubs/drunk.js';
import { installWeatherClient } from './world/weather.js';
import { installWinter } from './winter/index.js';
import { installTaxi } from './taxi/index.js';
import { installAttaches } from './attaches/index.js';
import { installServiceClient } from './jobs/service.js';
import { installGarageClient } from './vehicles/garage.js';
import { installAnimator } from './animations/index.js';
import { installBandZones } from './bands/zones.js';
import { installBackupBlips } from './mapcase/backup.js';
import { installFarmBales } from './farms/bales.js';

let tick: number | null = null;
let serverReady = false;
let preload = true;
let nextAsk = 0;

function askServer(): void {
  if (serverReady || Date.now() < nextAsk) return;
  nextAsk = Date.now() + 2000;
  mint.emitServer('crp:join');
}

function stopPreload(): void {
  if (!preload && !cefOpen()) return;
  preload = false;
  clearLineup();
  enterWorldUi();
  stopPreloadCam();
  enableWorldHud();
  pushCef('if (window.changelist) changelist.enable = true;');
  startChat();
  mint.toggleGameControls(true);
}

function start(): void {
  if (tick !== null) return;
  mint.toggleGameControls(false);
  tick = mint.everyTick(() => {
    tickHud();
    tickDeath();
    if (!preload) return;
    mint.toggleGameControls(false);
    native.displayHud(false);
    native.displayRadar(false);
    hideLocalPlayer();
    if (lineupActive()) {
      tickSelectCam();
      tickLineup();
    } else {
      showPreloadCam();
      if (!serverReady) drawLoading();
      else if (cefOpen()) mint.showCursor(true);
    }
    askServer();
  });
  askServer();
}

mint.onServer('crp:init', () => {
  serverReady = true;
  openCef();
});

mint.onServer('crp:cef', (code) => {
  if (typeof code !== 'string') return;
  if (code.includes('auth.showLoginResult(7)')) commitRemember();
  pushCef(code);
  if (code.includes('auth.show = true')) {
    const remembered = fillRemembered();
    if (remembered) pushCef(remembered);
  }
});

mint.onServer('crp:chars', (slots, count) => {
  if (typeof slots === 'number' && typeof count === 'number') resetSlots(slots, count);
});

mint.onServer('crp:lineup', (raw) => {
  if (typeof raw !== 'string') return;
  queueLineup(raw);
  showSelectCam(0);
});

mint.onServer('crp:creator', () => {
  resetDraft();
  fadeIn(500);
});

mint.onServer('crp:preloadEnd', () => {
  stopPreload();
  fadeIn(500);
});

mint.on('connectionComplete', () => {
  serverReady = false;
  preload = true;
  nextAsk = 0;
  clearLineup();
  disableWorldHud();
  closeCef();
  start();
});

mint.on('disconnect', () => {
  serverReady = false;
  preload = false;
  clearLineup();
  disableWorldHud();
  closeCef();
  stopPreloadCam();
});

mint.on('resourceStop', () => {
  clearLineup();
  disableWorldHud();
  stopPreload();
  if (tick !== null) mint.clearEveryTick(tick);
  tick = null;
});

mint.onServer('crp:chat', (text) => {
  if (typeof text === 'string') showChatLine(text);
});

mint.on('keyup', (key) => {
  if (key === 27) {
    releaseUi();
    return;
  }
  if (key === 84 && !busyHas()) openChat();
  if (key === 73 && !busyHas()) pushCef('if (inventory && inventory.enable && !inventory.show) inventory.show = true;');
});

setMpHandler(handleMp);
installVoiceKeys();
installHotkeys();
installDeathClient();
installVehicleKeys();
installOwnVehiclesClient();
installVehicleSync();
installVehicleSignalKeys();
installPhoneKeys();
installShopKeys();
installPlaces();
installAnticheat();
installAdmin();
installFly();
installPeace();
installCarshow();
installNametags();
installFactions();
installTuning();
installCarMarket();
installBootInventory();
installGroundClient();
installTradeClient();
installDoors();
installActivities();
installPoliceClient();
installVehicleCabin();
installInteraction();
installInteractionMoney();
installDocumentsClient();
installFamiliarClient();
installSettingsClient();
installAfk();
installArmyFuel();
installDrunk();
installWeatherClient();
installWinter();
installTaxi();
installAttaches();
installServiceClient();
installGarageClient();
installAnimator();
installBandZones();
installBackupBlips();
installFarmBales();
start();
