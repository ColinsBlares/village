"use strict";

let opened = false;

function payloadJson(payload) {
    if (typeof payload === "string") return payload;
    return JSON.stringify(payload);
}

mp.events.add({
    "trade.offer": () => {
        const target = mp.getCurrentInteractionEntity && mp.getCurrentInteractionEntity();
        if (!target || target.type != "player") return mp.notify.error("Игрок не найден", "Обмен");
        mp.events.callRemote("trade.offer", target.remoteId);
    },
    "trade.apply": (payload) => {
        opened = true;
        mp.callCEFV("trade.apply(" + payloadJson(payload) + ")");
    },
    "trade.close": () => {
        opened = false;
        mp.callCEFV("trade.close()");
    },
    "trade.cancel": () => {
        mp.events.callRemote("trade.cancel");
    },
    "trade.item.add": (sqlId) => {
        mp.events.callRemote("trade.item.add", sqlId);
    },
    "trade.item.remove": (sqlId) => {
        mp.events.callRemote("trade.item.remove", sqlId);
    },
    "trade.cash": (sum) => {
        mp.events.callRemote("trade.cash", sum);
    },
    "trade.ready": (sum, flag) => {
        mp.events.callRemote("trade.ready", sum, flag);
    },
    "trade.confirm": (sum) => {
        mp.events.callRemote("trade.confirm", sum);
    },
});
