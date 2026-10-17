let fishing = require('./index.js');
let inventory;
let notifs;
let utils;
let anticheat;

module.exports = {
    "init": async () => {
        inventory = call('inventory');
        notifs = call('notifications');
        utils = call('utils');
        anticheat = call('anticheat');
        await fishing.init();
        inited(__dirname);
    },
    "playerEnterColshape": (player, shape) => {
        if (!player.character) return;

        if (shape.isFisher) {
            player.call('fishing.menu.show', [fishing.rodPrice]);
            player.currentColshape = shape;
        }
    },
    "playerExitColshape": (player, shape) => {
        if (!player.character) return;

        if (shape.isFisher) {
            player.call('fishing.menu.close');
            player.currentColshape = null;
        }
    },
    "fishing.game.enter": (player) => {
        if (!player.character) return;
        if (inventory.getItemByItemId(player, fishing.getRodId())) return player.call('fishing.game.enter');

        notifs.error(player, "У вас нет удочки", "Ошибка");
        player.call('fishing.game.exit');
    },
    "fishing.game.start": async (player) => {
        if (!anticheat.guard(player, 'fishing.game.start')) return;
        if (!player.character) return;

        clearTimeout(player.timeoutFetch);
        delete player.fishingSession;

        let rod = inventory.getHandsItem(player);
        if (!rod || rod.itemId != fishing.getRodId()) rod = inventory.getItemByItemId(player, fishing.getRodId());
        if (!rod) return mp.events.call('fishing.game.exit', player);
        let health = inventory.getParam(rod, 'health').value;

        if (health <= 0) return mp.events.call('fishing.game.exit', player);

        inventory.updateParam(player, rod, 'health', health - 1);

        // Заход храним на игроке: рыба и вес не общие для всех рыбаков
        let fish = fishing.fishes[utils.randomInteger(0, fishing.fishes.length - 1)];

        let zone = utils.randomInteger(10, 20);
        let speed = parseInt(health / 5);
        let weight = utils.randomFloat(fish.minWeight, fish.maxWeight, 1);
        let time = utils.randomInteger(5, 15);
        let session = {
            fish,
            weight,
            startedAt: Date.now(),
            fetched: false
        };
        player.fishingSession = session;

        player.timeoutFetch = setTimeout(() => {
            try {
                if (player.fishingSession !== session) return;
                session.fetched = true;
                player.call('fishing.game.fetch', [speed, zone, weight]);
            } catch (e) {

            }
        }, time*1000);
    },
    "fishing.game.end": (player, result) => {
        if (!anticheat.guard(player, 'fishing.game.end')) return;
        if (!player.character) return;

        // Один end на один серверный заход и только после поклёвки
        let session = player.fishingSession;
        if (!session) return anticheat.trigger(player, 'flood', 'fishing.game.end без захода');
        delete player.fishingSession;
        if (!session.fetched) result = false;

        let rod = inventory.getItemByItemId(player, fishing.getRodId());
        let health = rod ? inventory.getParam(rod, 'health').value : 0;

        if (result) {
            inventory.addItem(player, 15, { weight: session.weight, name: session.fish.name }, (e) => {
                if (!e) {
                    notifs.success(player, `${session.fish.name} весом ${session.weight} кг добавлен(a) в инвентарь`, 'Отлично!');
                } else {
                    return notifs.error(player, e, 'Ошибка');
                }
            });
        } else {
            notifs.error(player, 'Рыба сорвалась', 'Провал!');
        }

        if (rod && health <= 0) {
            inventory.deleteItem(player, rod);
            notifs.error(player, 'Удочка сломалась', '');
            player.call('fishing.game.exit');
        }
    },
    "fishing.game.exit": (player) => {
        if (!player.character) return;

        clearTimeout(player.timeoutFetch);
        delete player.fishingSession;
    },
    "fishing.rod.buy": (player) => {
        if (!player.character) return;

        fishing.buyRod(player);
    },
    "fishing.fish.sell": (player) => {
        if (!player.character) return;

        fishing.sellFish(player);
    }
}
