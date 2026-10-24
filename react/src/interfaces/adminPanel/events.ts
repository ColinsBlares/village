import {
	openAdminPanel,
	setAdminPanelData,
} from './store';

export function registerAdminPanelEvents(gameEvents: GameEvents) {
	gameEvents.on('adminPanel.open', openAdminPanel);
	gameEvents.on('adminPanel.setData', setAdminPanelData);
}
