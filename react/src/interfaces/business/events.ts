import { closeBusiness, loadBusinessInfo, setAnswerBuyBusiness, setBusinessFaction, showBusiness } from './store';

export function registerBusinessEvents(gameEvents: GameEvents) {
    gameEvents.on('biz.menu', () => {
        showBusiness(true);
    });

    gameEvents.on('biz.load', (info) => {
        loadBusinessInfo(info);
    });

    gameEvents.on('biz.menu.close', () => {
        closeBusiness();
    });

    gameEvents.on('biz.buy.ans', (answer, owner, actions) => {
        setAnswerBuyBusiness({ answer, owner, actions });
    });

    gameEvents.on('biz.faction', (faction) => {
        setBusinessFaction(faction);
    });
}
