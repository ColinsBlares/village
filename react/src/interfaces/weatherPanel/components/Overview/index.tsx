import React, { memo, useEffect, useState } from 'react';
import styles from './index.module.css';
import { selectZone, useWeatherPanelStore, ZoneView } from '../../store';
import { send } from '../../mp';

function remain(until: number, offset: number) {
	if (!until) return 'по циклу';
	const left = until - (Date.now() + offset);
	if (left <= 0) return 'сейчас';
	const minutes = Math.ceil(left / 60000);
	return minutes + ' мин';
}

function ZoneRow(props: { zone: ZoneView; offset: number; pulse: number }) {
	const zone = props.zone;
	const held = zone.overrideUntil && zone.overrideUntil > Date.now() + props.offset;
	let when = 'смена через ' + remain(zone.nextChangeAt, props.offset);
	if (zone.locked) when = 'закрыта';
	else if (held) when = 'держится ' + remain(zone.overrideUntil, props.offset);
	const sign = zone.temperature > 0 ? '+' : '';

	return (
		<button
			type="button"
			className={styles.row}
			onClick={function () {
				selectZone(zone.id);
			}}
		>
			<span className={styles.swatch} style={{ background: zone.color }} />
			<span className={styles.name}>{zone.name}</span>
			<span className={styles.weatherName}>{zone.summary}</span>
			<span className={styles.temp}>{sign}{Math.round(zone.temperature)}°</span>
			<span className={styles.count}>{zone.players} чел.</span>
			<span className={styles.when}>{when}</span>
		</button>
	);
}

function Overview() {
	const zones = useWeatherPanelStore(state => state.zones);
	const weathers = useWeatherPanelStore(state => state.weathers);
	const categories = useWeatherPanelStore(state => state.categories);
	const globalWeather = useWeatherPanelStore(state => state.settings.globalWeather || '');
	const offset = useWeatherPanelStore(state => state.offset);
	const event = useWeatherPanelStore(state => state.event);
	const events = useWeatherPanelStore(state => state.events);
	const playersOnline = useWeatherPanelStore(state => state.playersOnline);
	const [pulse, setPulse] = useState(0);

	useEffect(function () {
		const id = window.setInterval(function () {
			setPulse(function (value) {
				return value + 1;
			});
		}, 1000);
		return function () {
			window.clearInterval(id);
		};
	}, []);

	const disaster = event ? events.find(item => item.id === event.type) : null;

	return (
		<div>
			{disaster ? <div className={styles.banner}>Сейчас: {disaster.label}</div> : null}
			<div className={styles.head}>
				<h2>Зоны · {playersOnline} на сервере</h2>
				<div className={styles.tools}>
					<button type="button" className={styles.btn} onClick={function () { send('randomizeAll'); }}>
						Случайная по всем
					</button>
					<button
						type="button"
						className={styles.btn}
						onClick={function () { send('global', { weather: '' }); }}
					>
						Снять общую
					</button>
				</div>
			</div>
			<div className={styles.rows}>
				{zones.map(function (zone) {
					return <ZoneRow key={zone.id} zone={zone} offset={offset} pulse={pulse} />;
				})}
			</div>
			{categories.map(function (category) {
				const list = weathers.filter(item => item.category === category.id);
				return (
					<section className={styles.group} key={category.id}>
						<h3>{category.label} на всю карту</h3>
						<div className={styles.weathers}>
							{list.map(function (item) {
								const on = globalWeather === item.id;
								return (
									<button
										key={item.id}
										type="button"
										className={on ? styles.weatherOn : styles.weather}
										onClick={function () {
											send('global', { weather: item.id });
										}}
									>
										{item.label}
									</button>
								);
							})}
						</div>
					</section>
				);
			})}
		</div>
	);
}

export default memo(Overview);
