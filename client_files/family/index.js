"use strict";

/*
    Модуль семей (кланов) на клиенте.
    Управляет CEF-меню создания и панелью управления семьёй.
*/

mp.family = {
    id: null,
    name: null,
    tag: null,
    cash: 0,
    level: 1,
    contract: { checkpoint: null, blip: null },
    rankId: null,
    rankName: null,
    rankNumber: 0,
    isLeader: false,
    ranks: [],
    inviteRank: 1,

    isMember() {
        return this.id != null;
    },
    set(data) {
        if (typeof data == 'string') data = JSON.parse(data);
        this.id = data.id;
        this.name = data.name;
        this.tag = data.tag;
        this.cash = data.cash;
        this.level = data.level;
        this.rankId = data.rankId;
        this.rankName = data.rankName;
        this.rankNumber = data.rankNumber;
        this.isLeader = data.isLeader;
        this.ranks = data.ranks;
        this.inviteRank = data.inviteRank;

        // Меню взаимодействия (G/M)
        mp.callCEFV(`interactionMenu.family = ${data.id}`);
        mp.callCEFV(`interactionMenu.familyCanInvite = ${data.rankNumber >= data.inviteRank}`);

        // Панель управления
        mp.callCEFV(`selectMenu.menus['familyControlRanks'].init(${JSON.stringify(data.ranks)})`);
        mp.callCEFV(`selectMenu.setProp('familyControl', 'isLeader', ${data.isLeader})`);
        mp.callCEFV(`selectMenu.setProp('familyControl', 'inviteRank', ${data.inviteRank})`);
        mp.callCEFV(`selectMenu.setProp('familyControl', 'uvalRank', ${data.uvalRank})`);
        mp.callCEFV(`selectMenu.setProp('familyControl', 'giveRankRank', ${data.giveRankRank})`);
        mp.callCEFV(`selectMenu.setProp('familyControlCash', 'balance', ${data.cash})`);
        mp.callCEFV(`selectMenu.setProp('familyControlVehicles', 'respawnPrice', ${data.vehRespawnPrice || 0})`);
        mp.callCEFV(`selectMenu.setProp('familyControl', 'houseId', ${data.houseId || null})`);
        mp.callCEFV(`selectMenu.menus['familyControl'].setLevel(${data.level || 1}, ${data.exp || 0}, ${data.expMax || 1000})`);
    },
    clear() {
        this.id = null;
        this.name = null;
        this.tag = null;
        this.cash = 0;
        this.rankId = null;
        this.rankName = null;
        this.rankNumber = 0;
        this.isLeader = false;
        this.ranks = [];

        mp.callCEFV(`interactionMenu.family = null`);
        mp.callCEFV(`interactionMenu.familyCanInvite = false`);
    },
    showCreateMenu(price, colorNames) {
        mp.callCEFV(`selectMenu.menus['familyCreate'].init(${price}, ${JSON.stringify(colorNames)})`);
        mp.callCEFV(`selectMenu.showByName('familyCreate')`);
    },
    showControl() {
        mp.callCEFV(`selectMenu.showByName('familyControl')`);
    },
    showVehicles(data) {
        mp.callCEFV(`selectMenu.menus['familyControlVehicles'].init(${JSON.stringify(data)})`);
        mp.callCEFV(`selectMenu.showByName('familyControlVehicles')`);
    },
    showGarageBuy(data) {
        mp.callCEFV(`selectMenu.menus['familyGarageBuy'].init(${JSON.stringify(data)})`);
        mp.callCEFV(`selectMenu.showByName('familyGarageBuy')`);
    },
    showMembers(data) {
        mp.callCEFV(`selectMenu.menus['familyControlMembers'].init(${JSON.stringify(data)})`);
        mp.callCEFV(`selectMenu.showByName('familyControlMembers')`);
    },
    setCash(cash) {
        this.cash = cash;
        mp.callCEFV(`selectMenu.setProp('familyControlCash', 'balance', ${cash})`);
    },
    startContract(data) {
        if (typeof data == 'string') data = JSON.parse(data);
        this.clearContract();
        var pos = new mp.Vector3(data.x, data.y, data.z);
        this.contract.checkpoint = mp.checkpoints.new(1, pos, 3, {
            color: [217, 143, 255, 150],
            visible: true,
            dimension: 0,
        });
        this.contract.checkpoint.familyContract = true;
        this.contract.blip = mp.blips.new(1, pos, {
            color: 5,
            name: "Контракт семьи",
            shortRange: false,
        });
        this.contract.blip.setRoute(true);
        mp.game.ui.setNewWaypoint(pos.x, pos.y);
    },
    clearContract() {
        if (this.contract.checkpoint) {
            this.contract.checkpoint.destroy();
            this.contract.checkpoint = null;
        }
        if (this.contract.blip) {
            this.contract.blip.destroy();
            this.contract.blip = null;
        }
    },
    setLevel(data) {
        if (typeof data == 'string') data = JSON.parse(data);
        this.level = data.level;
        mp.callCEFV(`selectMenu.menus['familyControl'].setLevel(${data.level}, ${data.exp}, ${data.expMax})`);
    },
};

mp.events.add({
    "family.set": (data) => {
        mp.family.set(data);
    },
    "family.clear": () => {
        mp.family.clear();
    },
    "family.create.show": (price, colorNames) => {
        mp.family.showCreateMenu(price, colorNames);
    },
    "family.control.players.show": (data) => {
        mp.family.showMembers(data);
    },
    "family.cash.set": (cash) => {
        mp.family.setCash(cash);
    },
    "family.control.show": () => {
        if (!mp.family.isMember()) return mp.notify.error(`Вы не состоите в семье`, `Семья`);
        mp.family.showControl();
    },
    "family.control.vehicles.show": (data) => {
        mp.family.showVehicles(data);
    },
    "family.garage.buy.show": (data) => {
        mp.family.showGarageBuy(data);
    },
    "family.level.set": (data) => {
        mp.family.setLevel(data);
    },
    "family.contract.start": (data) => {
        mp.family.startContract(data);
    },
    "family.contract.clear": () => {
        mp.family.clearContract();
    },
    "playerEnterCheckpoint": (checkpoint) => {
        if (!checkpoint || !checkpoint.familyContract) return;
        mp.events.callRemote("family.contract.complete");
    },
});
