import { setHudData, showHud } from './store';

export function registerHudEvents(gameEvents: GameEvents) {
	gameEvents.on('hud.show', (flag: boolean) => {
		showHud(flag);
	});

	gameEvents.on('hud.setData', (data: Record<string, any>) => {
		setHudData(data);
	});
}
