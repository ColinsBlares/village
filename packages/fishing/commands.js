let fishing = require('./index');
let anticheat = call('anticheat');

module.exports = {
    "/fi": {
        access: 6,
        handler: (player, args) => {
            anticheat.allowMove(player);
            player.position = new mp.Vector3(-1847.9312744140625, -1248.7381591796875, 8.615778923034668 );
        }
    },

    "/gotofisher": {
        access: 6,
        args: "[id]:n",
        handler: (player, args) => {
            let position = fishing.getFisherPosition(parseInt(args[0]));
            anticheat.allowMove(player);
            if (position) player.position = position;
        }
    },
}