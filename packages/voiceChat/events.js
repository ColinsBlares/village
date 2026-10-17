"use strict";
let voice = require("./index.js");
var notifs = call('notifications');

function radioGroup(player) {
    if (!player.character) return null;
    if (player.character.job) return 'job:' + player.character.job;
    if (player.character.factionId) return 'faction:' + player.character.factionId;
    return null;
}

function stopRadio(player) {
    if (!player.radioTalk) return;
    var group = player.radioTalk;
    player.radioTalk = null;
    mp.players.forEach(rec => {
        if (!rec.character || rec === player) return;
        if (radioGroup(rec) !== group) return;
        try { player.disableVoiceTo(rec); } catch (err) {}
        rec.call('voiceRadio.silence', [player.id]);
    });
}

/// Сервисные события
module.exports = {
    "voiceChat.add": (player, target) => {
        if(target) {
            player.enableVoiceTo(target);
        }
    },
    "voiceChat.remove": (player, target) => {
        if(target) {
            player.disableVoiceTo(target);
        }
    },
    "voiceChat.loopback": (player, enabled) => {
        if (!player.character) return;
        if (enabled) player.enableVoiceTo(player);
        else player.disableVoiceTo(player);
    },
    "voiceRadio.start": (player) => {
        if (!player.character || player.radioTalk) return;
        var group = radioGroup(player);
        if (!group) {
            player.call('voiceRadio.denied');
            return notifs.error(player, `Нет рации`, `Рация`);
        }
        player.radioTalk = group;
        mp.players.forEach(rec => {
            if (!rec.character || rec === player) return;
            if (radioGroup(rec) !== group) return;
            player.enableVoiceTo(rec);
            rec.call('voiceRadio.hear', [player.id]);
        });
    },
    "voiceRadio.stop": (player) => stopRadio(player),
    "playerQuit": (player) => stopRadio(player)
};