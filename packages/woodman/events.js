let notifs = call('notifications');
let woodman = call('woodman');
let anticheat = call('anticheat');
let inventory = call('inventory');

// Слоты от клиента только рядом с игроком
let nearSlots = (player, slots, max) => Array.isArray(slots) && slots.length <= max &&
    slots.every(slot => slot && anticheat.isNearXY(player, slot, 10));

module.exports = {
    "init": async () => {
        await woodman.init();
        inited(__dirname);
    },
    "woodman.items.buy": (player, index) => {
        if (!anticheat.guard(player, 'woodman.items.buy')) return;
        woodman.buyItem(player, index);
    },
    "woodman.clothes.buy": (player, index) => {
        if (!anticheat.guard(player, 'woodman.clothes.buy')) return;
        woodman.buyClothes(player, index);
    },
    "woodman.items.sell": (player) => {
        if (!anticheat.guard(player, 'woodman.items.sell')) return;
        woodman.sellItems(player);
    },
    "woodman.trees.hit": (player) => {
        if (!player.character) return;
        var header = `Лесоруб`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!player.tree) return out(`Вы не у дерева`);
        if (player.woodmanChop) return;
        if (!anticheat.jobCooldown(player, 'woodman.trees.hit', 1000)) return;
        var tree = player.tree;
        if (tree.health <= 0) return out(`Дерево исчерпало свой ресурс`);

        var axe = inventory.getHandsItem(player);
        var axeHealth = axe && inventory.getParam(axe, 'health');
        if (!woodman.isAx(axe)) return out(`Возьмите в руки топор`);
        if (!axeHealth || axeHealth.value <= 0) return out(`Топор сломан`);

        var damage = woodman.getTreeChopDamage(player);
        player.woodmanChop = {
            tree: tree,
            clicks: 0,
            lastClickAt: 0,
            damage: damage,
            startedAt: Date.now()
        };
        player.call(`woodman.tree.chop.start`, [Math.ceil(tree.health / damage), tree.health]);
    },
    "woodman.trees.chop.click": (player) => {
        if (!player.character) return;
        var session = player.woodmanChop;
        if (!session || !player.tree || session.tree !== player.tree) return;
        if (Date.now() - session.startedAt > 30000) {
            delete player.woodmanChop;
            player.call(`woodman.tree.chop.end`, [false]);
            return;
        }
        if (!anticheat.isNearXY(player, session.tree.db.pos, 4)) return;
        if (Date.now() - session.lastClickAt < 180) return;

        session.lastClickAt = Date.now();
        var before = session.tree.health;
        if (!woodman.hitTree(player, session.tree, session.damage)) {
            delete player.woodmanChop;
            player.call(`woodman.tree.chop.end`, [false]);
            return;
        }

        session.clicks++;
        if (before > 0 && !session.tree.health) {
            player.woodmanLogPending = session.tree;
            delete player.woodmanChop;
            player.call(`woodman.tree.chop.end`, [true]);
            return;
        }

        player.call(`woodman.tree.chop.progress`, [session.clicks]);
    },
    "woodman.trees.chop.cancel": (player) => {
        delete player.woodmanChop;
    },
    "woodman.logs.add": (player, slot) => {
        if (!player.character) return;
        slot = JSON.parse(slot);
        var header = `Лесоруб`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!player.tree) return out(`Вы не у дерева`);
        if (!player.woodmanLogPending || player.woodmanLogPending !== player.tree) return anticheat.trigger(player, 'job', `woodman.logs.add без срубленного дерева`);
        delete player.woodmanLogPending;
        if (!slot || !anticheat.isNearXY(player, slot.pos, 10)) return;
        woodman.addLogObject(player.tree, slot);
    },
    "woodman.logs.hit": (player, index) => {
        if (!player.character) return;
        var header = `Лесоруб`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!player.treeLog) return out(`Вы не у бревна`);
        if (!anticheat.jobCooldown(player, 'woodman.logs.hit', 1600)) return;
        index = parseInt(index);
        if (isNaN(index)) return;
        var log = player.treeLog;
        var before = log.squats.reduce((sum, value) => sum + value, 0);
        woodman.hitLog(player, log, index);
        if (before > 0 && !log.squats.reduce((sum, value) => sum + value, 0)) player.woodmanItemsPending = log;
    },
    "woodman.items.add": (player, slots) => {
        if (!player.character) return;
        slots = JSON.parse(slots);
        var header = `Лесоруб`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!player.treeLog) return out(`Вы не у бревна`);
        if (!player.woodmanItemsPending || player.woodmanItemsPending !== player.treeLog) return anticheat.trigger(player, 'job', `woodman.items.add без разрубленного бревна`);
        delete player.woodmanItemsPending;
        if (!nearSlots(player, slots, 5)) return anticheat.trigger(player, 'job', `woodman.items.add: слоты вне бревна`);
        woodman.addLogItems(player.treeLog, slots);
    },
    "playerEnterWorldObject": (player, colshape) => {
        if (colshape.db.type != 1) return;
        if (colshape.destroyTime) {
            if (Date.now() - colshape.destroyTime > woodman.respawnTreeTime) {
                colshape.health = 100;
                delete colshape.destroyTime;
            }
        }
        player.tree = colshape;
        player.call(`woodman.tree.inside`, [colshape.db.pos, colshape.health]);
    },
    "playerExitWorldObject": (player, obj) => {
        if (!player.tree) return;
        delete player.woodmanChop;
        delete player.tree;
        player.call(`woodman.tree.inside`);
    },
};
