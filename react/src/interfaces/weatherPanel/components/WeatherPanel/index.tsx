import React, { memo, useEffect } from 'react';
import styles from './index.module.css';
import Rail from '../Rail';
import Strip from '../Strip';
import Overview from '../Overview';
import Zones from '../Zones';
import Clock from '../Clock';
import Disasters from '../Disasters';
import Settings from '../Settings';
import { setTab, useWeatherPanelStore } from '../../store';
import { triggerMp } from '../../mp';

function WeatherPanel() {
	const show = useWeatherPanelStore(state => state.show);
	const tab = useWeatherPanelStore(state => state.tab);
	const selectedId = useWeatherPanelStore(state => state.selectedId);

	useEffect(function () {
		if (!show) return undefined;
		triggerMp('weather.zone.focus', selectedId || 0);
		return undefined;
	}, [show, selectedId]);

	useEffect(function () {
		if (!show) return undefined;
		function onKey(event: KeyboardEvent) {
			if (event.key !== 'Escape') return;
			const target = event.target as HTMLElement | null;
			const tag = target ? target.tagName : '';
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			triggerMp('weatherPanel.close');
		}
		window.addEventListener('keydown', onKey);
		return function () {
			window.removeEventListener('keydown', onKey);
		};
	}, [show]);

	if (!show) return null;

	let page = <Overview />;
	if (tab === 'zones') page = <Zones />;
	if (tab === 'time') page = <Clock />;
	if (tab === 'events') page = <Disasters />;
	if (tab === 'settings') page = <Settings />;

	return (
		<div className={styles.backdrop}>
			<div className={styles.panel} role="dialog" aria-label="Погода">
				<Rail tab={tab} onTab={setTab} />
				<Strip />
				<div className={styles.main}>{page}</div>
			</div>
		</div>
	);
}

export default memo(WeatherPanel);
