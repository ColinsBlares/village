import React, { Fragment, useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { GameScreen, getScreens } from './utils/screens';
import { useVisibilityStore } from './utils/visibility/store';

function ScreenView({ screen }: { screen: GameScreen }) {
	const open = useVisibilityStore(screen.select);
	const [View, setView] = useState<any>(null);

	useEffect(
		function () {
			if (!open) {
				return undefined;
			}

			let alive = true;
			screen.ensure().then(function (Loaded) {
				if (!alive || !Loaded) {
					return;
				}
				setView(function () {
					return Loaded;
				});
			});

			return function () {
				alive = false;
			};
		},
		[open, screen],
	);

	if (!open || !View) {
		return null;
	}

	const Screen = View;

	return (
		<ErrorBoundary>
			<Screen />
		</ErrorBoundary>
	);
}

const App = () => {
	const screens = getScreens();

	return (
		<Fragment>
			{screens.map(screen => (
				<ScreenView key={screen.id} screen={screen} />
			))}
		</Fragment>
	);
};

export default App;
