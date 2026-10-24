import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { useWeatherPanelStore } from '../../store';
import { send } from '../../mp';

function Disasters() {
	const events = useWeatherPanelStore(state => state.events);
	const active = useWeatherPanelStore(state => state.event);
	const zones = useWeatherPanelStore(state => state.zones);
	const selectedId = useWeatherPanelStore(state => state.selectedId);
	const [minutes, setMinutes] = useState(6);
	const zone = zones.find(item => item.id === selectedId) || null;

	return (
		<div>
			<p className={styles.note}>
				Песчаная буря и сильный снег ставятся как погода зоны. Здесь события, которые трясут район или накрывают весь штат.
				{zone ? ' Локальные стартуют в «' + zone.name + '».' : ''}
			</p>
			<label className={styles.hold}>
				Минут
				<input
					type="number"
					min={1}
					max={30}
					value={minutes}
					onChange={function (event) {
						setMinutes(Math.max(1, Math.min(30, Number(event.target.value) || 1)));
					}}
				/>
			</label>
			<div className={styles.list}>
				{events.map(function (item) {
					const on = !!(active && active.type === item.id);
					return (
						<article key={item.id} className={on ? styles.cardOn : styles.card}>
							<h3>{item.label}{item.global ? ' · весь штат' : ''}</h3>
							<div className={styles.actions}>
								{on ? (
									<button type="button" className={styles.btn} onClick={function () { send('eventStop'); }}>
										Остановить
									</button>
								) : (
									<button
										type="button"
										className={styles.primary}
										onClick={function () {
											send('event', {
												type: item.id,
												zoneId: item.global ? 0 : (zone ? zone.id : 0),
												minutes: minutes,
											});
										}}
									>
										Запустить
									</button>
								)}
							</div>
							<p>{item.text}</p>
						</article>
					);
				})}
			</div>
		</div>
	);
}

export default memo(Disasters);
