let anticheat = call('anticheat');
module.exports = {
    "/bs": {
        args: '',
        access: 6,
        handler: (player, args) => {
            anticheat.allowMove(player);
            player.position = new mp.Vector3(-1286.63818359375, -1117.1209716796875, 6.990111827850342);
        }
    }
}