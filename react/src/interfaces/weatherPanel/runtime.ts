import WeatherPanel from './components/WeatherPanel';
import { registerWeatherPanelEvents } from './events';
import { initWeatherPanelBridge, useWeatherPanelStore } from './store';

export default {
	id: 'weatherPanel',
	Component: WeatherPanel,
	useVisible: () => useWeatherPanelStore(state => state.show),
	init: initWeatherPanelBridge,
	register: registerWeatherPanelEvents,
};

export function readOpen() {
	return useWeatherPanelStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useWeatherPanelStore.subscribe(listener);
}
