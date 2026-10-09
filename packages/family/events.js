"use strict";

let family = require('./index');
let notifs = require('../notifications');
let inventory = null;

module.exports = {
    "init": async () => {
        inventory = call('inventory');
        await family.init();
        inited(__dirname);
    },
    "characterInit.done": (player) => {
        family.setFamilyData(player);
    },

    // ************** Создание **************
    "family.create": (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        if (!player.nearFamilyCreate) return notifs.error(player, `Подойдите к точке создания семьи`, `Создание семьи`);
        family.createFamily(player, data.name, data.tag, data.colorIndex);
    },

    // ************** Приглашение **************
    "family.invite.show": async (player, recId) => {
        var header = `Приглашение в семью`;
        var rec = mp.players.at(recId);
        if (!rec || !rec.character) return notifs.error(player, `Игрок #${recId} не найден`, header);
        if (player.dist(rec.position) > 10) return notifs.error(player, `${rec.name} далеко`, header);
        if (rec.character.familyId) return notifs.error(player, `${rec.name} уже в семье`, header);
        if (!player.character.familyId) return notifs.error(player, `Вы не состоите в семье`, header);
        if (!family.canInvite(player)) return notifs.error(player, `Недостаточно прав`, header);

        var fam = family.getFamily(player.character.familyId);
        var count = await family.getMembersCount(fam);
        if (count >= family.getMaxMembers(fam)) return notifs.error(player, `Достигнут лимит участников (${family.getMaxMembers(fam)})`, header);

        rec.offer = {
            type: "family_invite",
            inviterId: player.id,
        };
        rec.call(`offerDialog.show`, ["family_invite", {
            name: player.name,
            family: `${fam.name} [${fam.tag}]`
        }]);
        notifs.success(player, `Приглашение отправлено ${rec.name}`, header);
    },
    "family.invite.accept": async (player) => {
        var header = `Семья`;
        if (!player.offer || player.offer.type != "family_invite") return notifs.error(player, `Приглашение не найдено`, header);
        var inviter = mp.players.at(player.offer.inviterId);
        delete player.offer;
        if (!inviter || !inviter.character) return notifs.error(player, `Пригласивший не найден`, header);
        if (player.dist(inviter.position) > 10) return notifs.error(player, `${inviter.name} далеко`, header);
        if (player.character.familyId) return notifs.error(player, `Вы уже в семье`, header);
        if (!inviter.character.familyId) return notifs.error(player, `${inviter.name} не состоит в семье`, header);
        if (!family.canInvite(inviter)) return notifs.error(player, `У ${inviter.name} недостаточно прав`, header);

        var fam = family.getFamily(inviter.character.familyId);
        var count = await family.getMembersCount(fam);
        if (count >= family.getMaxMembers(fam)) return notifs.error(player, `Достигнут лимит участников`, header);

        family.addMember(fam, player);
        family.log(fam.id, player.character.id, "join", `invited by ${inviter.name}`);
        notifs.success(inviter, `${player.name} вступил в семью`, fam.name);
        notifs.success(player, `Добро пожаловать в семью ${fam.name}`, header);
    },
    "family.invite.cancel": (player) => {
        if (!player.offer) return;
        var inviter = mp.players.at(player.offer.inviterId);
        delete player.offer;
        if (!inviter || !inviter.character) return;
        notifs.info(player, `Приглашение отклонено`, `Семья`);
        notifs.info(inviter, `${player.name} отклонил приглашение`, `Семья`);
    },

    // ************** Выход / роспуск / лидерство **************
    "family.leave": (player) => {
        family.leaveFamily(player);
    },
    "family.disband": (player) => {
        var header = `Роспуск семьи`;
        if (!player.character.familyId) return notifs.error(player, `Вы не состоите в семье`, header);
        if (!family.isLeader(player)) return notifs.error(player, `Только лидер может распустить семью`, header);
        var fam = family.getFamily(player.character.familyId);
        family.disband(fam);
        notifs.success(player, `Семья ${fam.name} распущена`, header);
    },
    "family.leadership.transfer": (player, recId) => {
        family.transferLeadership(player, recId);
    },

    // ************** Панель управления: состав **************
    "family.control.members.online.show": (player) => {
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.canGiveRank(player) && !family.canUval(player)) return out(`Недостаточно прав`);

        var fam = family.getFamily(player.character.familyId);
        var members = family.getMembers(player).map(x => {
            return {
                id: x.id,
                name: x.name,
                rank: family.getRankById(fam, x.character.familyRank).rank,
            };
        });
        player.call(`family.control.players.show`, [{
            members: members,
            rankNames: family.getRankNames(fam),
        }]);
    },
    "family.control.members.offline.show": async (player) => {
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.canGiveRank(player) && !family.canUval(player)) return out(`Недостаточно прав`);

        var fam = family.getFamily(player.character.familyId);
        var members = await db.Models.Character.findAll({
            attributes: ['id', 'name', 'familyId', 'familyRank'],
            where: { familyId: player.character.familyId }
        });
        members = members.map(x => {
            return {
                sqlId: x.id,
                name: x.name,
                rank: family.getRankById(fam, x.familyRank).rank,
            };
        });
        player.call(`family.control.players.show`, [{
            members: members,
            rankNames: family.getRankNames(fam),
        }]);
    },
    "family.control.members.ranks.set": async (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.canGiveRank(player)) return out(`Недостаточно прав`);

        var rec = (data.recId != null) ? mp.players.at(data.recId) : mp.players.getBySqlId(data.sqlId);
        var character = null;
        if (!rec || !rec.character) {
            character = await db.Models.Character.findByPk(data.sqlId, {
                attributes: ['id', 'name', 'familyId', 'familyRank'],
            });
            rec = data.sqlId;
        } else {
            character = rec.character;
        }
        if (!character) return out(`Игрок не найден`);
        if (character.familyId != player.character.familyId) return out(`${character.name} не в вашей семье`);
        if (character.familyRank >= player.character.familyRank) return out(`Недоступно для ${character.name}`);

        var rank = family.getRank(player.character.familyId, data.rank);
        if (!rank) return out(`Ранг не найден`);
        if (rank.id > character.familyRank) {
            if (rank.id >= player.character.familyRank) return out(`Нельзя повысить до своего ранга или выше`);
            notifs.info(rec, `${player.name} повысил вас до ${rank.name}`, `Семья`);
            out(`${character.name} повышен до ${rank.name}`);
        } else {
            notifs.info(rec, `${player.name} понизил вас до ${rank.name}`, `Семья`);
            out(`${character.name} понижен до ${rank.name}`);
        }

        if (typeof rec == 'number') family.setOfflineRank(character, rank);
        else family.setRank(rec, rank);
    },
    "family.control.members.uval": async (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.canUval(player)) return out(`Недостаточно прав`);

        var rec = (data.recId != null) ? mp.players.at(data.recId) : mp.players.getBySqlId(data.sqlId);
        var character = null;
        if (!rec || !rec.character) {
            character = await db.Models.Character.findByPk(data.sqlId, {
                attributes: ['id', 'name', 'familyId', 'familyRank'],
            });
            rec = data.sqlId;
        } else {
            character = rec.character;
        }
        if (!character) return out(`Игрок не найден`);
        if (character.familyId != player.character.familyId) return out(`${character.name} не в вашей семье`);
        if (player.character.familyRank <= character.familyRank) return out(`${character.name} должен иметь ниже ранг`);

        var fam = family.getFamily(player.character.familyId);
        family.log(fam.id, player.character.id, "uval", character.name);
        if (typeof rec == 'number') family.deleteOfflineMember(character);
        else family.deleteMember(rec);

        out(`${character.name} исключён из семьи`);
        notifs.info(rec, `${player.name} исключил вас из семьи`, `Семья`);
    },

    // ************** Панель управления: ранги **************
    "family.control.ranks.set": (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        var out = (text) => notifs.error(player, text);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Вы не лидер`);

        var fam = family.getFamily(player.character.familyId);
        var rank = family.getRank(fam, data.rank);
        if (!rank) return out(`Ранг не найден`);
        if (!data.name || !data.name.trim()) return out(`Введите название ранга`);

        rank.name = data.name.trim();
        rank.save();

        mp.players.forEach(rec => {
            if (!rec.character || rec.character.familyId != fam.id) return;
            notifs.info(rec, `${player.name} изменил название ранга`, fam.name);
            family.setFamilyData(rec);
        });
    },
    "family.control.access.set": (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        var out = (text) => notifs.error(player, text);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Вы не лидер`);

        var key = ["inviteRank", "uvalRank", "giveRankRank"][data.index];
        if (!key) return;
        var fam = family.getFamily(player.character.familyId);
        fam[key] = data.rank;
        fam.save();

        mp.players.forEach(rec => {
            if (!rec.character || rec.character.familyId != fam.id) return;
            notifs.info(rec, `${player.name} изменил доступ к составу`, fam.name);
            family.setFamilyData(rec);
        });
    },

    // ************** Панель управления: общак **************
    "family.control.cash.deposit": (player, sum) => {
        family.depositCash(player, sum);
    },
    "family.control.cash.withdraw": (player, sum) => {
        family.withdrawCash(player, sum);
    },

    // ************** Панель управления: настройки **************
    "family.control.settings.set": (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        var out = (text) => notifs.error(player, text);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Вы не лидер`);

        var fam = family.getFamily(player.character.familyId);
        if (data.colorIndex != null) {
            family.setBlipColor(fam, data.colorIndex);
            mp.players.forEach(rec => {
                if (!rec.character || rec.character.familyId != fam.id) return;
                family.setFamilyData(rec);
            });
        }
        if (data.tag != null && data.tag.trim() && data.tag.trim() != fam.tag) {
            family.changeTag(player, data.tag);
        } else {
            notifs.success(player, `Настройки сохранены`, `Семья`);
        }
    },

    // ************** Гараж: панель управления **************
    "family.control.vehicles.show": (player) => {
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Вы не лидер`);

        var fam = family.getFamily(player.character.familyId);
        var list = family.getVehicles(fam).map(x => {
            return {
                id: x.id,
                name: x.properties.name,
                plate: x.db.plate,
                minRank: x.db.minRank ? x.db.minRank.rank : null,
            };
        });
        player.call(`family.control.vehicles.show`, [{ vehicles: list }]);
    },
    "family.control.vehicles.minRank.set": (player, data) => {
        if (typeof data == 'string') data = JSON.parse(data);
        var out = (text) => notifs.error(player, text);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Вы не лидер`);

        var veh = mp.vehicles.at(data.vehId);
        if (!veh || !veh.db || veh.db.key != 'family' || veh.db.owner != player.character.familyId) return out(`Авто не найдено`);
        family.setVehicleMinRank(veh, data.rank);

        var fam = family.getFamily(player.character.familyId);
        mp.players.forEach(rec => {
            if (!rec.character || rec.character.familyId != fam.id) return;
            notifs.info(rec, `${player.name} изменил мин. ранг авто ${veh.properties.name} (${veh.db.plate})`, fam.name);
        });
    },
    "family.control.vehicles.respawn": (player) => {
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Вы не лидер`);

        var fam = family.getFamily(player.character.familyId);
        var price = family.config.vehRespawnPrice;
        if (fam.cash < price) return out(`В общаке нужно $${price}`);

        var count = family.respawnVehicles(fam);
        if (!count) return out(`Нет свободного транспорта`);

        fam.cash -= price;
        fam.save();
        family.pushCash(fam);
        family.log(fam.id, player.character.id, 'veh_respawn', `${count}`);
        out(`Возвращено авто: ${count} (-$${price})`);
    },

    // ************** Гараж: покупка **************
    "family.garage.buy.show": (player) => {
        var out = (text) => player.call(`selectMenu.notification`, [text]);
        if (!player.character.familyId) return out(`Вы не состоите в семье`);
        if (!family.isLeader(player)) return out(`Только лидер может покупать транспорт`);

        player.call(`family.garage.buy.show`, [{
            vehicles: family.config.familyVehicles.map(x => {
                return { name: x.name, price: x.price };
            }),
        }]);
    },
    "family.garage.buy": (player, index) => {
        family.buyVehicle(player, parseInt(index));
    },

    // ************** Дом семьи **************
    "family.control.house.bind": (player) => {
        family.bindHouse(player);
    },
    "family.control.house.unbind": (player) => {
        family.unbindHouse(player);
    },

    // ************** Склад семьи **************
    "family.storage.request": (player, holder) => {
        var header = `Склад семьи`;
        if (!player.character || !player.character.familyId) return;
        if (player.character.familyId != holder.familyId) return;
        if (!family.canUseStorage(player)) return notifs.error(player, `Недостаточно прав для склада`, header);

        var items = holder.inventory.items;
        if (!items) return notifs.error(player, `Склад недоступен`, header);

        var place = {
            sqlId: -holder.familyId,
            header: header,
            pockets: inventory.getEnvironmentClientPockets(items, "Family"),
        };
        player.inventory.place.sqlId = place.sqlId;
        player.inventory.place.type = "Family";
        player.inventory.place.items = items;
        player.call(`inventory.addEnvironmentPlace`, [place]);
    },
    "family.storage.clear": (player, holder) => {
        player.inventory.place = {};
        player.call(`inventory.deleteEnvironmentPlace`, [-holder.familyId]);
    },

    // ************** Контракты **************
    "family.contract.take": (player) => {
        family.takeContract(player);
    },
    "family.contract.complete": (player) => {
        family.completeContract(player);
    },
    "family.contract.cancel": (player) => {
        family.cancelContract(player);
    },

    // ************** Семейный транспорт: доступ **************
    "playerEnterVehicle": (player, vehicle, seat) => {
        if (seat != 0 || vehicle.key != 'family') return;
        if (!player.character) return;
        var fam = family.getFamily(vehicle.owner);
        if (player.character.familyId != vehicle.owner) {
            notifs.error(player, `Это семейный транспорт${fam ? ` семьи ${fam.name}` : ''}`, `Семья`);
            return player.removeFromVehicle();
        }
        if (vehicle.db && vehicle.db.minRank) {
            var minRank = family.getRank(fam, vehicle.db.minRank.rank);
            var myRank = family.getRankById(fam, player.character.familyRank);
            if (minRank && myRank && myRank.rank < minRank.rank) {
                notifs.error(player, `Доступно с ранга ${minRank.name}`, fam ? fam.name : `Семья`);
                player.removeFromVehicle();
            }
        }
    },
};
