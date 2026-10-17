let satiety = require('./index.js');
let anticheat = call('anticheat');
module.exports = {
    "init": () => {
        inited(__dirname);
    },
    "characterInit.done": (player) => {
        anticheat.allowHeal(player);
        player.health = player.character.health;
        satiety.startTimer(player);
        player.call(`hud.setData`, [{
            satiety: player.character.satiety,
            thirst: player.character.thirst
        }]);
    },
    "playerQuit": (player) => {
        if (!player.character) return;
        satiety.stopTimer(player);
        player.character.health = anticheat.legalHealth(player);
        player.character.save();
    }
};
