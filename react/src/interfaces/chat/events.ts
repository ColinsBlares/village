import { pushMessage, setFocusChat, setOpacityChat, setSizeChat, setTagsChat, setTimeChat, showChat } from './store';

export function registerChatEvents(gameEvents: GameEvents) {
    gameEvents.on('pushChatMessage', (message) => {
        pushMessage(message);
    });

    gameEvents.on('showChat', (param) => {
        showChat(param);
    });

    gameEvents.on('setFocusChat', (param) => {
        setFocusChat(param);
    });

    gameEvents.on('setTimeChat', (flag) => {
        setTimeChat(flag);
    });

    gameEvents.on('setOpacityChat', (opacity) => {
        setOpacityChat(opacity);
    });

    gameEvents.on('setTagsChat', (tags) => {
        setTagsChat(tags);
    });

    gameEvents.on('setSizeChat', (size) => {
        setSizeChat(size);
    });
}
