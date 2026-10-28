import PhoneOs from './components/PhoneOs';
import { registerPhoneOsEvents } from './events';
import { initPhoneOsBridge, usePhoneOsStore } from './store';

export function init() {
	initPhoneOsBridge();
}

export function register(gameEvents: GameEvents) {
	registerPhoneOsEvents(gameEvents);
}

export function readOpen() {
	const state = usePhoneOsStore.getState();
	return state.show || state.shell !== 'off';
}

export function subscribe(listener: () => void) {
	return usePhoneOsStore.subscribe(listener);
}

export default {
	id: 'phoneOs',
	Component: PhoneOs,
	init: init,
};
