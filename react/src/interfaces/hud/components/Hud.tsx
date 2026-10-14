import React, { memo, useEffect } from 'react';
import styles from './Hud.module.css';
import { syncLegacyHudState } from '../store';
import Keys from './Keys';
import Info from './Info';
import Wanted from './Wanted';
import PlayerState from './PlayerState';
import Arrest from './Arrest';
import Voice from './Voice';
import Starvation from './Starvation';
import Weather from './Weather';
import { useHudStore } from '../store';

function TopPanel() {
	const promptText = useHudStore(state => state.promptText);

	if (promptText) {
		return null;
	}

	return (
		<div className={styles.panelRightTop}>
			<Info />
			<Wanted />
			<PlayerState />
			<Arrest />
		</div>
	);
}

const TopPanelView = memo(TopPanel);

function Hud() {
	const leftWeather = useHudStore(state => state.leftWeather);
	useEffect(() => {
		syncLegacyHudState();
		const interval = window.setInterval(syncLegacyHudState, 1000);
		return () => {
			window.clearInterval(interval);
		};
	}, []);

	return (
		<div className={styles.hud}>
			<Keys />
			<TopPanelView />
			<div
				className={styles.panelLeftBottom}
				style={{ left: leftWeather + 'px' }}
			>
				<Voice />
				<Starvation />
				<Weather />
			</div>
		</div>
	);
}

export default memo(Hud);
