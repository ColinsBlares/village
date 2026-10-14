import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';
import Voice from '../Voice';

const weatherModules = import.meta.glob<{ default: string }>(
	'@imgs/weather/*.svg',
	{ eager: true },
);

const WEATHER_ICONS: Record<string, string> = {};
Object.keys(weatherModules).forEach(key => {
	const match = key.match(/\/([^/]+)\.svg$/);
	if (match) {
		WEATHER_ICONS[match[1]] = weatherModules[key].default;
	}
});

function Weather() {
	const region = useHudStore(state => state.region);
	const street = useHudStore(state => state.street);
	const temperature = useHudStore(state => state.temperature);
	const weather = useHudStore(state => state.weather);
	const summary = useHudStore(state => state.summary);
	const icon = WEATHER_ICONS[weather] || WEATHER_ICONS['clear-day'] || '';

	const temperatureString = temperature > 0 ? `+${temperature}` : temperature;

	return (
		<div className={`${styles.weather__container} ${styles.block}`}>
			<div className={styles.region__container}>
				<span>{region}</span>
				<span>{street}</span>
			</div>
			<span className={styles.divider} />
			<img src={icon} alt='' className={styles.weather__icon} />
			<div className={styles.temperature__container}>
				<span>{temperatureString}°C</span>
				<span>{summary}</span>
			</div>
		</div>
	);
}

export default memo(Weather);
