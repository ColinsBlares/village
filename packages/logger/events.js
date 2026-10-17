const logger = require('./index');
let anticheat = call('anticheat');

module.exports = {
    "logger.log": (player, text, moduleName = null) => {
        // Клиент своими строками в Log не пишет: логи — доказательная база админов
        if (!player.character) return;
        if (player.character.admin < 1) return anticheat.trigger(player, 'logspam', `logger.log: ${String(text).slice(0, 60)}`);
        logger.log(String(text).slice(0, 500), moduleName ? String(moduleName).slice(0, 32) : null, player);
    },
    "logger.debug": (player, text, moduleName = null) => {
        // ErrorBoundary React шлёт debug и у игроков: без админки молча не пишем, не кикаем
        if (!player.character || player.character.admin < 1) return;
        if (anticheat.hit(player, 'logger.debug', 5, 10000)) return;
        logger.debug(String(text).slice(0, 500), moduleName ? String(moduleName).slice(0, 32) : null, player);
    },
}
