import { addPlayer, loadPlayers, removePlayer, showPlayers, updatePlayer } from './store';

export function registerPlayerEvents(gameEvents: GameEvents) {
    gameEvents.on('players.show', (flag) => {
        showPlayers(flag);
    });

    gameEvents.on('players.load', (players) => {
        loadPlayers(players);
    });

    gameEvents.on('players.add', (player) => {
        addPlayer(player);
    });

    gameEvents.on('players.remove', (id) => {
        removePlayer(id);
    });

    gameEvents.on('players.update', (id, data) => {
        updatePlayer(id, data);
    });
}
