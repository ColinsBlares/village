"use strict";

const trade = require("./index.js");
const anticheat = call("anticheat");

module.exports = {
    "init": () => {
        inited(__dirname);
    },
    "trade.offer": (player, targetId) => {
        if (!anticheat.guard(player, "trade.offer", 4, 5000)) return;
        trade.offer(player, targetId);
    },
    "trade.accept": (player, fromId) => {
        if (!anticheat.guard(player, "trade.accept", 4, 5000)) return;
        trade.accept(player, fromId);
    },
    "trade.decline": (player, fromId) => {
        trade.decline(player, fromId);
    },
    "trade.item.add": (player, sqlId) => {
        if (!anticheat.guard(player, "trade.item", 20, 3000)) return;
        trade.addItem(player, sqlId);
    },
    "trade.item.remove": (player, sqlId) => {
        if (!anticheat.guard(player, "trade.item", 20, 3000)) return;
        trade.removeItem(player, sqlId);
    },
    "trade.cash": (player, sum) => {
        if (!anticheat.guard(player, "trade.cash", 12, 3000)) return;
        trade.setCash(player, sum);
    },
    "trade.ready": (player, sum, flag) => {
        if (!anticheat.guard(player, "trade.ready", 8, 3000)) return;
        trade.ready(player, sum, flag);
    },
    "trade.confirm": (player, sum) => {
        if (!anticheat.guard(player, "trade.confirm", 6, 3000)) return;
        trade.confirm(player, sum);
    },
    "trade.cancel": (player) => {
        trade.cancelRequest(player);
    },
    "playerQuit": (player) => {
        trade.drop(player);
    },
    "playerDeath": (player) => {
        trade.drop(player);
    },
};
