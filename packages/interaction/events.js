let interaction = require("./index.js");

let money = call('money');
let anticheat = call('anticheat');

module.exports = {
    "interaction.money.give": (player, targetId, sum) => {
        if (!anticheat.guard(player, 'interaction.money.give')) return;
        let target = mp.players.at(targetId);

        if (!target || !target.character) return player.call('interaction.money.ans', [0]);
        if (target == player) return player.call('interaction.money.ans', [5]);
        // Передача на руки только рядом, в одном измерении
        if (target.dimension != player.dimension || player.dist(target.position) > 5) {
            anticheat.trigger(player, 'money', `передача денег игроку ${target.id} издалека`);
            return player.call('interaction.money.ans', [0]);
        }
        
        let value = parseInt(sum);

        if (!value || isNaN(value)) return player.call('interaction.money.ans', [1]);;
        if (value < 1 || value > 500) return player.call('interaction.money.ans', [1]);;

        if (player.character.cash < value) return player.call('interaction.money.ans', [2]);

        money.moveCash(player, target, value, function(result) {
            if (result) {
                player.call('interaction.money.ans', [4]);
                target.call('notifications.push.success', [`+$${value} от ID: ${player.id}`, `Деньги`]);
            } else {
                player.call('interaction.money.ans', [3]);
            }
        }, `Передача денег на руки от игрока #${player.character.id} игроку #${target.character.id}`);
    }
}