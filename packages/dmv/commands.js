let dmv = require('./index');
let anticheat = call('anticheat');

module.exports = {
    "/dmv": {
        description: "Телепорт к DMV",
        access: 6,
        args: "",
        handler: (player, args) => {
            let data = dmv.getDMVdata();
            anticheat.allowMove(player);
            player.position = new mp.Vector3(data.exit.toX, data.exit.toY, data.exit.toZ);
        }
    },
}