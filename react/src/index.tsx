import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadScreens } from './utils/screens';
import { events } from './utils/shared/events';
import { useVisibilityStore } from './utils/visibility/store';
import './assets/styles/main.css';
import './assets/fonts/fonts.css';
import './assets/styles/animations.css';

if (!import.meta.env.DEV) {
	mp.event = events;
}

loadScreens().then(function (screens) {
	const pending = screens.filter(function (screen) {
		return screen.select(useVisibilityStore.getState());
	}).map(function (screen) {
		return screen.ensure();
	});

	return Promise.all(pending);
}).then(function () {
	const rootEl = document.getElementById('root');
	if (rootEl) {
		createRoot(rootEl).render(<App />);
	}
});
