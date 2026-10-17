"use strict";

var serializer = require('./index.js');

// Команды сериализатора — access 6, события вызываются клиентом напрямую
var isOwner = (player) => !!(player && player.character && player.character.admin >= 6);

module.exports = {
    'serializer.save.all': (player) => {
        if (!isOwner(player)) return;
        serializer.saveAll(player);
    },
    'serializer.save.table': (player, tableName) => {
        if (!isOwner(player)) return;
        serializer.saveTable(player, tableName);
    },
    'serializer.clear.all': (player) => {
        if (!isOwner(player)) return;
        serializer.clearAll(player);
    },
    'serializer.clear.table': (player, tableName) => {
        if (!isOwner(player)) return;
        serializer.clearTable(player, tableName);
    },
    'serializer.load.all': (player) => {
        if (!isOwner(player)) return;
        serializer.loadAll(player);
    },
    'serializer.load.table': (player, tableName) => {
        if (!isOwner(player)) return;
        serializer.loadTable(player, tableName);
    },
    'serializer.clear.files': (player) => {
        if (!isOwner(player)) return;
        serializer.deleteAllFiles(player);
    }
};
