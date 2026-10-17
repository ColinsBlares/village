"use strict";

// Список всех анимаций
let list = require('./data.js');

module.exports = {
    init() {

    },
    playAnimation(player, dict, name, speed, flag) {
        // player.playAnimation(dict, name, speed, flag);
        player.setVariable("anim", {
            dict: dict,
            name: name,
            speed: speed,
            flag: flag
        });
    },
    playAnimationById(player, id) {
        id = Math.clamp(id, 0, list.length - 1);
        var anim = list[id].split(' ');
        this.playAnimation(player, anim[0], anim[1], 1, 1);
    },
    stopAnimation(player) {
        // player.stopAnimation();
        player.setVariable("anim", null);
    },
    // Длинный ролик лежит в переменной, поэтому его видит и тот, кто застримился позже
    playTimed(player, dict, name, speed, flag, time) {
        this.playAnimation(player, dict, name, speed, flag);
        var playerId = player.id;
        var characterId = player.character ? player.character.id : null;
        call('timer').add(() => {
            var rec = mp.players.at(playerId);
            if (!rec || !mp.players.exists(rec) || !rec.character || rec.character.id != characterId) return;
            var anim = rec.getVariable('anim');
            if (!anim || anim.dict != dict || anim.name != name) return;
            this.stopAnimation(rec);
        }, time);
    },
    has(dict, name) {
        return list.findIndex(x => x == (dict + " " + name)) != -1;
    },
}
