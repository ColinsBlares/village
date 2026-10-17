let familiar = call('familiar');
let notifs = call('notifications');
let animations = call('animations');

module.exports = {
    "init": () => {
        inited(__dirname);
    },
    "characterInit.done": (player) => {
        familiar.initList(player);
    },
    "familiar.add": (player, recId) => {
        // console.log(`familiar.add: ${player.name} ${recId}`)
        var header = `Знакомство`;
        var rec = mp.players.at(recId);
        if (!rec || !rec.character) return notifs.error(player, `Игрок #${recId} не найден`, header);
        if (player.dist(rec.position) > 10) return notifs.error(player, `${rec.name} далеко`, header);
        if (familiar.have(player, rec.character.id)) return notifs.error(player, `Вы уже знакомы с ${rec.name}`, header);

        rec.call(`offerDialog.show`, ["familiar", {
            playerId: player.id
        }]);
    },
    "familiar.accept": (player, recId) => {
        var header = `Знакомство`;
        var rec = mp.players.at(recId);
        if (!rec || !rec.character) return notifs.error(player, `Игрок #${recId} не найден`, header);
        if (player.dist(rec.position) > 10) return notifs.error(player, `${rec.name} далеко`, header);
        if (familiar.have(player, rec.character.id)) return notifs.error(player, `Вы уже знакомы с ${rec.name}`, header);
        if (rec.getVariable("knocked")) return notifs.error(player, `Игрок не в состоянии знакомиться`, header);

        familiar.add(player, rec);

        notifs.success(player, `${rec.name} ваш новый знакомый`, header);
        notifs.success(rec, `${player.name} ваш новый знакомый`, header);

        if (!player.vehicle && !player.getVariable("knocked")) {
            animations.playTimed(player, "mp_ped_interaction", "handshake_guy_a", 1, 1, 5000);
        }
        if (!rec.vehicle && !rec.getVariable("knocked")) {
            animations.playTimed(rec, "mp_ped_interaction", "handshake_guy_a", 1, 1, 5000);
        }
    },
    "player.name.changed": (player, oldName) => {
        mp.players.forEach(rec => {
            if (!rec.character) return;

            rec.call(`familiar.name.update`, [player.name, oldName]);
        });
    },
};
