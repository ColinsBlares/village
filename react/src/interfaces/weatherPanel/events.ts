import { applyLive, hideWeatherPanel, LivePatch, openWeatherPanel, PanelPayload, setWeatherPanel } from './store';

export function registerWeatherPanelEvents(gameEvents: GameEvents) {
	gameEvents.on('weatherPanel.open', function (payload: PanelPayload) {
		openWeatherPanel(payload);
	});
	gameEvents.on('weatherPanel.setData', function (payload: PanelPayload) {
		setWeatherPanel(payload);
	});
	gameEvents.on('weatherPanel.tick', function (payload: LivePatch) {
		applyLive(payload);
	});
	gameEvents.on('weatherPanel.hide', function () {
		hideWeatherPanel();
	});
}
