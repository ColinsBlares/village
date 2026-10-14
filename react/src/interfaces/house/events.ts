import {
    closeEnterMenuHouse,
    closeHouse,
    loadHouseInfo,
    setAnswerBuyHouse,
    setAnswerEnterHouse,
    showEnterMenuHouse,
    showHouse,
} from './store';

export function registerHouseEvents(gameEvents: GameEvents) {
    gameEvents.on('house.menu', () => {
        showHouse(true);
    });

    gameEvents.on('house.load', (info) => {
        loadHouseInfo(info);
    });

    gameEvents.on('house.menu.close', () => {
        closeHouse();
    });

    gameEvents.on('house.menu.enter', (place) => {
        showEnterMenuHouse(place);
    });

    gameEvents.on('house.menu.enter.close', () => {
        closeEnterMenuHouse();
    });

    gameEvents.on('house.buy.ans', (answer, owner) => {
        setAnswerBuyHouse({ answer, owner });
    });

    gameEvents.on('house.enter.ans.err', () => {
        setAnswerEnterHouse({ answer: 'error' });
    });
}
