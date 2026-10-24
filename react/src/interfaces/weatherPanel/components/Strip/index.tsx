import React, { memo, useEffect, useState } from 'react';
import styles from './index.module.css';
import { skyFrom, TimeSnap, useWeatherPanelStore } from '../../store';
import { send } from '../../mp';

function pad(value: number) {
	return value < 10 ? '0' + value : String(value);
}

function phaseOf(hour: number) {
	if (hour >= 5 && hour < 8) return 'dawn';
	if (hour >= 8 && hour < 17) return 'day';
	if (hour >= 17 && hour < 21) return 'dusk';
	return 'night';
}

function useMovingClock(time: TimeSnap) {
	const [view, setView] = useState(function () {
		return skyFrom(time, 0);
	});

	useEffect(function () {
		const started = Date.now();
		function frame() {
			setView(skyFrom(time, (Date.now() - started) / 1000));
		}
		frame();
		const id = window.setInterval(frame, 1000);
		return function () {
			window.clearInterval(id);
		};
	}, [time.hour, time.minute, time.second, time.scale, time.frozen, time.realtime, time.stamp]);

	return view;
}

function Strip() {
	const time = useWeatherPanelStore(state => state.time);
	const blackout = useWeatherPanelStore(state => !!state.settings.blackout);
	const event = useWeatherPanelStore(state => state.event);
	const events = useWeatherPanelStore(state => state.events);
	const zone = useWeatherPanelStore(state => {
		return state.zones.find(item => item.id === state.selectedId) || null;
	});
	const clock = zone && zone.clock && zone.clock.enabled
		? {
			hour: zone.clock.hour,
			minute: zone.clock.minute,
			second: zone.clock.second || 0,
			realtime: false,
			frozen: zone.clock.frozen,
			scale: zone.clock.scale,
			stamp: zone.clock.stamp || zone.id,
		}
		: time;
	const view = useMovingClock(clock);
	const disaster = event ? events.find(item => item.id === event.type) : null;
	const sign = zone && zone.temperature > 0 ? '+' : '';
	const temp = zone ? sign + Math.round(zone.temperature) + '°' : '';

	return (
		<header className={styles.strip} data-phase={phaseOf(view.hour)}>
			<div>
				<p className={styles.digits}>{pad(view.hour)}:{pad(view.minute)}</p>
				<span className={styles.sub}>{zone && zone.clock && zone.clock.enabled ? 'Часы зоны' : 'Часы штата'}</span>
			</div>
			<div className={styles.readout}>
				<p className={styles.name}>{zone ? zone.summary : 'Нет зоны'}</p>
				<p className={styles.meta}>
					{zone ? zone.name : 'Выберите зону'}
					{temp ? ' · ' + temp : ''}
					{disaster ? ' · ' + disaster.label : ''}
				</p>
			</div>
			<div className={styles.side}>
				<button
					type="button"
					className={blackout ? styles.lampOn : styles.lamp}
					onClick={function () {
						send('settings', { key: 'blackout', value: !blackout });
					}}
				>
					{blackout ? 'Свет погашен' : 'Свет горит'}
				</button>
			</div>
			<div className={styles.zoneLine} style={{ background: zone ? zone.color : 'transparent' }} />
		</header>
	);
}

export default memo(Strip);
