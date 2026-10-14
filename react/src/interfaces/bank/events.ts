import {
    closeBank,
    setAnswerBank,
    setAskAnswerBank,
    showBank,
    updateBank,
} from './store';

export function registerBankEvents(gameEvents: GameEvents) {
    gameEvents.on('bank.show', (bankInfo) => {
        showBank(bankInfo);
    });

    gameEvents.on('bank.update', (bankInfo) => {
        updateBank(bankInfo);
    });

    gameEvents.on('bank.close', () => {
        closeBank();
    });

    gameEvents.on('bank.push.ans', (result) => {
        setAnswerBank({ type: 'push', answer: result });
    });

    gameEvents.on('bank.pop.ans', (result) => {
        setAnswerBank({ type: 'pop', answer: result });
    });

    gameEvents.on('bank.phone.push.ans', (result) => {
        setAnswerBank({ type: 'phone', answer: result });
    });

    gameEvents.on('bank.house.push.ans', (result) => {
        setAnswerBank({ type: 'house', answer: result });
    });

    gameEvents.on('bank.biz.push.ans', (result) => {
        setAnswerBank({ type: 'biz', answer: result });
    });

    gameEvents.on('bank.biz.cashbox.push.ans', (result) => {
        setAnswerBank({ type: 'cashbox_push', answer: result });
    });

    gameEvents.on('bank.biz.cashbox.pop.ans', (result) => {
        setAnswerBank({ type: 'cashbox_pop', answer: result });
    });

    gameEvents.on('bank.transfer.ask.ans', (nick) => {
        setAskAnswerBank(nick);
    });

    gameEvents.on('bank.transfer.ans', (result) => {
        setAnswerBank({ type: 'transfer', answer: result });
    });
}
