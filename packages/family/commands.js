"use strict";

let family = require('./index');

module.exports = {
    "/famlist": {
        description: "Список всех семей.",
        access: 1,
        args: "",
        handler: (player, args, out) => {
            var text = "ID) Название [тег] | лидер(charId) | ур. | общак<br/>";
            family.families.forEach(fam => {
                text += `${fam.id}) ${fam.name} [${fam.tag}] | ${fam.leaderId} | ${fam.level} | $${fam.cash}<br/>`;
            });
            if (!family.families.length) text += "Семей нет<br/>";
            out.log(text, player);
        }
    },
    "/famtp": {
        description: "Телепорт к базе семьи (если задана).",
        access: 1,
        args: "[ид_семьи]:n",
        handler: (player, args, out) => {
            var fam = family.getFamily(args[0]);
            if (!fam) return out.error(`Семья #${args[0]} не найдена`, player);
            if (fam.x == null) return out.error(`У семьи нет базы (дома)`, player);
            player.position = new mp.Vector3(fam.x, fam.y, fam.z + 0.5);
            player.dimension = fam.d || 0;
            out.info(`Вы телепортировались к семье ${fam.name}`, player);
        }
    },
    "/famadd": {
        description: "Добавить игрока в семью.",
        access: 6,
        args: "[ид_игрока]:n [ид_семьи]:n",
        handler: (player, args, out) => {
            var rec = mp.players.at(args[0]);
            if (!rec || !rec.character) return out.error(`Игрок #${args[0]} не найден`, player);
            var fam = family.getFamily(args[1]);
            if (!fam) return out.error(`Семья #${args[1]} не найдена`, player);

            family.addMember(fam, rec);
            out.info(`${player.name} добавил ${rec.name} в семью ${fam.name}`);
        }
    },
    "/famuval": {
        description: "Исключить игрока из семьи.",
        access: 6,
        args: "[ид_игрока]:n",
        handler: (player, args, out) => {
            var rec = mp.players.at(args[0]);
            if (!rec || !rec.character) return out.error(`Игрок #${args[0]} не найден`, player);
            if (!rec.character.familyId) return out.error(`${rec.name} не состоит в семье`, player);

            var fam = family.getFamily(rec.character.familyId);
            family.deleteMember(rec);
            out.info(`${player.name} исключил ${rec.name} из семьи ${fam ? fam.name : '-'}`);
        }
    },
    "/famsetleader": {
        description: "Назначить лидера семьи.",
        access: 6,
        args: "[ид_игрока]:n [ид_семьи]:n",
        handler: (player, args, out) => {
            var rec = mp.players.at(args[0]);
            if (!rec || !rec.character) return out.error(`Игрок #${args[0]} не найден`, player);
            var fam = family.getFamily(args[1]);
            if (!fam) return out.error(`Семья #${args[1]} не найдена`, player);

            family.setLeader(fam, rec);
            out.info(`${player.name} назначил ${rec.name} лидером семьи ${fam.name}`);
        }
    },
    "/famsetcash": {
        description: "Изменить общак семьи.",
        access: 6,
        args: "[ид_семьи]:n [сумма]:n",
        handler: (player, args, out) => {
            var fam = family.getFamily(args[0]);
            if (!fam) return out.error(`Семья #${args[0]} не найдена`, player);

            out.info(`${player.name} изменил общак семьи ${fam.name} ($${fam.cash} => $${args[1]})`);
            fam.cash = parseInt(args[1]);
            fam.save();
            family.pushCash(fam);
        }
    },
    "/famsetlevel": {
        description: "Изменить уровень семьи.",
        access: 6,
        args: "[ид_семьи]:n [уровень]:n",
        handler: (player, args, out) => {
            var fam = family.getFamily(args[0]);
            if (!fam) return out.error(`Семья #${args[0]} не найдена`, player);

            out.info(`${player.name} изменил уровень семьи ${fam.name} (${fam.level} => ${args[1]})`);
            fam.level = Math.clamp(parseInt(args[1]), 1, 100);
            fam.save();
        }
    },
    "/famsetrankname": {
        description: "Изменить название ранга семьи.",
        access: 6,
        args: "[ид_семьи]:n [номер_ранга]:n [название]",
        handler: (player, args, out) => {
            var fam = family.getFamily(args[0]);
            if (!fam) return out.error(`Семья #${args[0]} не найдена`, player);
            var rank = family.getRank(fam, args[1]);
            if (!rank) return out.error(`Ранг #${args[1]} не найден`, player);

            args.splice(0, 2);
            var name = args.join(" ").trim();
            if (!name) return out.error(`Введите название`, player);
            out.info(`${player.name} изменил ранг семьи ${fam.name} (${rank.name} => ${name})`);
            rank.name = name;
            rank.save();
            mp.players.forEach(rec => {
                if (!rec.character || rec.character.familyId != fam.id) return;
                family.setFamilyData(rec);
            });
        }
    },
    "/famdel": {
        description: "Распустить семью.",
        access: 6,
        args: "[ид_семьи]:n",
        handler: (player, args, out) => {
            var fam = family.getFamily(args[0]);
            if (!fam) return out.error(`Семья #${args[0]} не найдена`, player);
            var name = fam.name;
            family.disband(fam);
            out.info(`${player.name} распустил семью ${name}`);
        }
    },
};
