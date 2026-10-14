import React from 'react';

export interface GameScreen {
	id: string;
	order?: number;
	select: (state: Record<string, boolean>) => boolean;
	ensure: () => Promise<React.ComponentType<any> | null>;
}

interface ScreenModule {
	default: GameScreen | GameScreen[];
}

const modules = import.meta.glob<ScreenModule>('../interfaces/*/index.ts');

let loadedScreens: GameScreen[] = [];

function screenOrder(screen: GameScreen) {
	return screen.order == null ? 100 : screen.order;
}

export function getScreens(): GameScreen[] {
	return loadedScreens;
}

export function loadScreens(): Promise<GameScreen[]> {
	const keys = Object.keys(modules);

	return Promise.all(
		keys.map(function (key) {
			return modules[key]();
		}),
	).then(function (loadedModules) {
		const screens: GameScreen[] = [];

		loadedModules.forEach(function (mod) {
			const loaded = mod.default;

			if (Array.isArray(loaded)) {
				loaded.forEach(function (screen) {
					screens.push(screen);
				});
				return;
			}

			if (loaded) {
				screens.push(loaded);
			}
		});

		screens.sort(function (a, b) {
			return screenOrder(a) - screenOrder(b) || a.id.localeCompare(b.id);
		});

		loadedScreens = screens;
		return screens;
	});
}
