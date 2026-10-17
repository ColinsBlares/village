var taxi = require('./index.js');
let anticheat = call('anticheat');
module.exports = {
    "/ta": {
        access: 6,
        handler: (player, args) => {
            anticheat.allowMove(player);
            player.position = new mp.Vector3(901.0866088867188, -180.15689086914062, 73.91134643554688 );
        }
    },
    "/orders": {
        access: 6,
        handler: (player, args) => {
            console.log(taxi.getOrders());
        }
    }
}