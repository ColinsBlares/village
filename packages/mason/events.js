let notifs = call('notifications');
let mason = call('mason');
let anticheat = call('anticheat');

module.exports = {
    "init": async () => {
        await mason.init();
        inited(__dirname);
    },
    "mason.items.buy": (player, index) => {
        if (!anticheat.guard(player, 'mason.items.buy')) return;
        mason.buyItem(player, index);
    },
    "mason.clothes.buy": (player, index) => {
        if (!anticheat.guard(player, 'mason.clothes.buy')) return;
        mason.buyClothes(player, index);
    },
    "mason.items.sell": (player) => {
        if (!anticheat.guard(player, 'mason.items.sell')) return;
        mason.sellItems(player);
    },
    "mason.rocks.hit": (player) => {
        if (!player.character) return;
        var header = `Каменщик`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!player.rock) return out(`Вы не у каменной породы`);
        if (!anticheat.jobCooldown(player, 'mason.rocks.hit', 400)) return;
        var rock = player.rock;
        var before = rock.health;
        mason.hitRock(player, rock);
        // Камни положены только за породу, добитую этим ударом
        if (before > 0 && !rock.health) player.masonItemsPending = rock;
    },
    "mason.items.add": (player, slots) => {
        if (!player.character) return;
        slots = JSON.parse(slots);
        var header = `Каменщик`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!player.rock) return out(`Вы не у каменной породы`);
        if (!player.masonItemsPending || player.masonItemsPending !== player.rock) return anticheat.trigger(player, 'job', `mason.items.add без добытой породы`);
        delete player.masonItemsPending;
        if (!Array.isArray(slots) || slots.length > 3 || !slots.every(slot => slot && anticheat.isNearXY(player, slot, 10)))
            return anticheat.trigger(player, 'job', `mason.items.add: слоты вне породы`);
        mason.addRockItems(player.rock, slots);
    },
    "playerEnterWorldObject": (player, colshape) => {
        if (colshape.db.type != 2) return;
        if (colshape.destroyTime) {
            if (Date.now() - colshape.destroyTime > mason.respawnRockTime) {
                colshape.health = 100;
                delete colshape.destroyTime;
            }
        }
        player.rock = colshape;
        player.call(`mason.rock.inside`, [colshape.db.pos, colshape.health]);
    },
    "playerExitWorldObject": (player, obj) => {
        if (!player.rock) return;
        delete player.rock;
        player.call(`mason.rock.inside`);
    },
};
