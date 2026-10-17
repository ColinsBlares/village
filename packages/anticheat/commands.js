let anticheat = require('./index');

module.exports = {
    "/aclist": {
        description: "Посмотреть параметры анти-чита.",
        access: 3,
        args: "",
        handler: (player, args, out) => {
            var text = "ID) Имя (описание) - наказание [состояние]<br/>";
            for (var i = 0; i < anticheat.params.length; i++) {
                var param = anticheat.params[i];
                text += `${param.id}) ${param.name} (${param.description}) - ${param.punish} [${param.enable? 'вкл' : 'выкл'}]<br/>`;
            }
            text += `<br/>Виды наказаний:<br/>`;
            text += `notify: оповестить администраторов<br/>`;
            text += `kick: кикнуть игрока<br/>`;
            text += `ban: занести serial и Social Club в AntiCheatBan и кикнуть<br/>`;
            out.log(text, player);
        }
    },
    "/acbans": {
        description: "Последние баны анти-чита.",
        access: 6,
        args: "",
        handler: async (player, args, out) => {
            var bans = await db.Models.AntiCheatBan.findAll({
                order: [['id', 'DESC']],
                limit: 20
            });
            if (!bans.length) return out.info(`Банов анти-чита нет`, player);
            var text = "ID) Имя (причина) - дата<br/>";
            bans.forEach(ban => {
                text += `${ban.id}) ${ban.name} (${ban.reason}) - ${ban.date.toLocaleString()}<br/>`;
            });
            out.log(text, player);
        }
    },
    "/acunban": {
        description: "Снять бан анти-чита (см. /acbans).",
        access: 6,
        args: "[ид_бана]:n",
        handler: async (player, args, out) => {
            var ban = await anticheat.unban(args[0]);
            if (!ban) return out.error(`Бан #${args[0]} не найден`, player);
            out.info(`${player.name} снял бан анти-чита #${ban.id} (${ban.name})`);
        }
    },
    "/acenable": {
        description: "Вкл/выкл параметр анти-чита (состояние - 0/1).",
        access: 3,
        args: "[ид_параметра]:n [состояние]:b",
        handler: (player, args, out) => {
            var param = anticheat.params.find(x => x.id == args[0]);
            if (!param) return out.error(`Параметр #${args[0]} не найден`, player);

            anticheat.enableParam(param.id, args[1]);
            out.info(`${player.name} ${param.enable? 'включил' : 'отключил'} параметр ${param.name}`);
        }
    },
    "/acpunish": {
        description: "Изменить наказание параметра анти-чита (см. /aclist).",
        access: 3,
        args: "[ид_параметра]:n [наказание]",
        handler: (player, args, out) => {
            var param = anticheat.params.find(x => x.id == args[0]);
            if (!param) return out.error(`Параметр #${args[0]} не найден`, player);
            if (!anticheat.punishments.includes(args[1])) return out.error(`Неверное наказание`, player);

            anticheat.setPunishParam(param.id, args[1]);
            out.info(`${player.name} изменил наказание параметра ${param.name} на ${param.punish}`);
        }
    },
}
