let death = call('death');
let factions = call('factions');
let notifs = call('notifications');
let anticheat = call('anticheat');

const spawnDeath = new mp.Vector3(352.10, -599.12, 43.28);
const spawnHeading = 69.88;
// Максимальное время ранения на клиенте (medKnockTime)
const maxKnockTime = 10 * 60 * 1000;

module.exports = {
    "init": () => {
        inited(__dirname);
    },
    "death.wait": (player, time) => {
        // Живой игрок не может лечь в ранение и получить здоровье
        if (!player.character || !anticheat.isDead(player) || player.getVariable("knocked")) return anticheat.reject(player, 'health', 'death.wait без смерти');
        time = Math.clamp(parseInt(time) || 0, 0, maxKnockTime);
        anticheat.allowSpawn(player);
        player.spawn(player.position);
        player.health = death.health;
        if (player.character && player.character.arrestTime) return;
        death.addKnocked(player, time);
        if (time > 5 * 60 * 1000) mp.events.call(`mapCase.ems.calls.add`, player, `Ранение`);
    },
    "death.spawn": (player) => {
        // Телепорт в больницу только мёртвому или раненому
        if (!player.character) return;
        var allowed = anticheat.isDead(player) || player.getVariable("knocked") || death.knockedList.includes(player.character.id);
        if (!allowed) return anticheat.reject(player, 'teleport', 'death.spawn без смерти');
        anticheat.allowSpawn(player);
        if (player.character.arrestTime) {
            player.spawn(player.position);
            player.dimension = 0;
            player.health = 10;
            return;
        }
        death.removeKnocked(player);
        player.spawn(spawnDeath);
        player.heading = spawnHeading;
        player.dimension = 0;
        player.health = 10;
    },
    "playerDeath": (player, reason, killer) => {

    },
    "playerQuit": (player) => {
        if (!player.getVariable("knocked")) return;

        death.addKnocked(player);
    },
};
