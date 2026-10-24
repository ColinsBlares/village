import React, { memo, useEffect, useState } from 'react';
import styles from './index.module.css';
import { CycleRow, selectZoneOnly, useWeatherPanelStore, ZoneClock, ZoneView } from '../../store';
import { send, triggerMp } from '../../mp';

interface Draft {
	name: string;
	color: string;
	priority: string;
	enabled: boolean;
	minZ: string;
	maxZ: string;
	transitionSec: string;
	followForecast: boolean;
	clock: ZoneClock;
	cycle: CycleRow[];
}

function toDraft(zone: ZoneView): Draft {
	return {
		name: zone.name,
		color: zone.color,
		priority: String(zone.priority),
		enabled: zone.enabled,
		minZ: String(zone.minZ),
		maxZ: String(zone.maxZ),
		transitionSec: String(zone.transitionSec),
		followForecast: zone.followForecast,
		clock: {
			enabled: zone.clock.enabled,
			hour: zone.clock.hour,
			minute: zone.clock.minute,
			second: zone.clock.second || 0,
			frozen: zone.clock.frozen,
			scale: zone.clock.scale,
		},
		cycle: zone.cycle.map(function (row) {
			return { id: row.id, chance: row.chance, minMin: row.minMin, maxMin: row.maxMin };
		}),
	};
}

function Zones() {
	const zones = useWeatherPanelStore(state => state.zones);
	const selectedId = useWeatherPanelStore(state => state.selectedId);
	const weathers = useWeatherPanelStore(state => state.weathers);
	const categories = useWeatherPanelStore(state => state.categories);
	const zone = zones.find(item => item.id === selectedId) || null;
	const [hold, setHold] = useState(20);
	const [draft, setDraft] = useState<Draft | null>(null);

	useEffect(function () {
		const current = useWeatherPanelStore.getState().zones.find(item => item.id === selectedId) || null;
		setDraft(current ? toDraft(current) : null);
	}, [selectedId]);

	function patch(partial: Partial<Draft>) {
		setDraft(function (prev) {
			if (!prev) return prev;
			return Object.assign({}, prev, partial);
		});
	}

	return (
		<div className={styles.layout}>
			<div className={styles.list}>
				{zones.map(function (item) {
					const on = item.id === selectedId;
					return (
						<button
							key={item.id}
							type="button"
							className={on ? styles.itemOn : styles.item}
							onClick={function () {
								selectZoneOnly(item.id);
							}}
						>
							{item.name}
							<span>{item.summary} · {item.players} чел.</span>
						</button>
					);
				})}
				<button type="button" className={styles.create} onClick={function () { send('create'); }}>
					Новая зона здесь
				</button>
			</div>
			<div className={styles.form}>
				{zone && draft ? (
					<>
						<label className={styles.hold}>
							Держать минут
							<input
								type="number"
								min={0}
								max={240}
								value={hold}
								onChange={function (event) {
									setHold(Number(event.target.value) || 0);
								}}
							/>
							<span>0 — отдать циклу</span>
						</label>
						{categories.map(function (category) {
							const list = weathers.filter(item => item.category === category.id);
							return (
								<section className={styles.group} key={category.id}>
									<h3>{category.label}</h3>
									<div className={styles.weathers}>
										{list.map(function (item) {
											const on = zone.weather === item.id;
											return (
												<button
													key={item.id}
													type="button"
													className={on ? styles.weatherOn : styles.weather}
													onClick={function () {
														send('weather', { id: zone.id, weather: item.id, minutes: hold });
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
						<div className={styles.actions}>
							<button
								type="button"
								className={styles.btn}
								onClick={function () { send('lock', { id: zone.id, locked: !zone.locked }); }}
							>
								{zone.locked ? 'Открыть цикл' : 'Закрыть зону'}
							</button>
							<button type="button" className={styles.btn} onClick={function () { send('randomize', { id: zone.id }); }}>
								Случайная
							</button>
						</div>
						<div className={styles.grid}>
							<label className={styles.field}>
								Название
								<input value={draft.name} onChange={function (event) { patch({ name: event.target.value }); }} />
							</label>
							<label className={styles.field}>
								Цвет
								<input type="color" value={draft.color} onChange={function (event) { patch({ color: event.target.value }); }} />
							</label>
							<label className={styles.field}>
								Приоритет
								<input value={draft.priority} onChange={function (event) { patch({ priority: event.target.value }); }} />
							</label>
							<label className={styles.field}>
								Переход, сек
								<input value={draft.transitionSec} onChange={function (event) { patch({ transitionSec: event.target.value }); }} />
							</label>
							<label className={styles.field}>
								Нижняя высота
								<input value={draft.minZ} onChange={function (event) { patch({ minZ: event.target.value }); }} />
							</label>
							<label className={styles.field}>
								Верхняя высота
								<input value={draft.maxZ} onChange={function (event) { patch({ maxZ: event.target.value }); }} />
							</label>
						</div>
						<label className={styles.check}>
							<input
								type="checkbox"
								checked={draft.enabled}
								onChange={function (event) { patch({ enabled: event.target.checked }); }}
							/>
							Зона включена
						</label>
						<label className={styles.check}>
							<input
								type="checkbox"
								checked={draft.followForecast}
								onChange={function (event) { patch({ followForecast: event.target.checked }); }}
							/>
							Брать прогноз Лос-Анджелеса вместо цикла
						</label>
						<section className={styles.group}>
							<h3>Свои часы</h3>
							<label className={styles.check}>
								<input
									type="checkbox"
									checked={draft.clock.enabled}
									onChange={function (event) {
										patch({ clock: Object.assign({}, draft.clock, { enabled: event.target.checked }) });
									}}
								/>
								В этой зоне другое время
							</label>
							<div className={styles.grid}>
								<label className={styles.field}>
									Час
									<input
										type="number"
										min={0}
										max={23}
										value={draft.clock.hour}
										onChange={function (event) {
											patch({ clock: Object.assign({}, draft.clock, { hour: Number(event.target.value) || 0 }) });
										}}
									/>
								</label>
								<label className={styles.field}>
									Минута
									<input
										type="number"
										min={0}
										max={59}
										value={draft.clock.minute}
										onChange={function (event) {
											patch({ clock: Object.assign({}, draft.clock, { minute: Number(event.target.value) || 0 }) });
										}}
									/>
								</label>
								<label className={styles.field}>
									Минут игры за реальную минуту
									<input
										type="number"
										min={0}
										max={60}
										value={draft.clock.scale}
										onChange={function (event) {
											patch({ clock: Object.assign({}, draft.clock, { scale: Number(event.target.value) || 0 }) });
										}}
									/>
								</label>
							</div>
							<label className={styles.check}>
								<input
									type="checkbox"
									checked={draft.clock.frozen}
									onChange={function (event) {
										patch({ clock: Object.assign({}, draft.clock, { frozen: event.target.checked }) });
									}}
								/>
								Остановить часы зоны
							</label>
						</section>
						<section className={styles.group}>
							<h3>Граница · {zone.points.length} точек</h3>
							{zone.points.slice(0, 8).map(function (point, index) {
								return (
									<p className={styles.point} key={index}>
										{index + 1}. {Math.round(point.x)}, {Math.round(point.y)}
									</p>
								);
							})}
							{zone.points.length > 8 ? <p className={styles.point}>и ещё {zone.points.length - 8}</p> : null}
							<div className={styles.points}>
								<button type="button" className={styles.btn} onClick={function () { send('pointAdd', { id: zone.id }); }}>
									Точка где стою
								</button>
								<button type="button" className={styles.btn} onClick={function () { send('pointPop', { id: zone.id }); }}>
									Убрать последнюю
								</button>
								<button
									type="button"
									className={styles.btn}
									onClick={function () { triggerMp('weather.boundary', zone.id); }}
								>
									Править на земле
								</button>
							</div>
						</section>
						<section className={styles.group}>
							<h3>Цикл · веса, не проценты</h3>
							{draft.cycle.map(function (row, index) {
								return (
									<div className={styles.cycle} key={index}>
										<select
											value={row.id}
											onChange={function (event) {
												const cycle = draft.cycle.slice();
												cycle[index] = Object.assign({}, row, { id: event.target.value });
												patch({ cycle: cycle });
											}}
										>
											{weathers.map(function (item) {
												return <option key={item.id} value={item.id}>{item.label}</option>;
											})}
										</select>
										<input
											type="number"
											value={row.chance}
											onChange={function (event) {
												const cycle = draft.cycle.slice();
												cycle[index] = Object.assign({}, row, { chance: Number(event.target.value) || 0 });
												patch({ cycle: cycle });
											}}
										/>
										<input
											type="number"
											value={row.minMin}
											onChange={function (event) {
												const cycle = draft.cycle.slice();
												cycle[index] = Object.assign({}, row, { minMin: Number(event.target.value) || 1 });
												patch({ cycle: cycle });
											}}
										/>
										<input
											type="number"
											value={row.maxMin}
											onChange={function (event) {
												const cycle = draft.cycle.slice();
												cycle[index] = Object.assign({}, row, { maxMin: Number(event.target.value) || 1 });
												patch({ cycle: cycle });
											}}
										/>
										<button
											type="button"
											className={styles.btn}
											onClick={function () {
												patch({ cycle: draft.cycle.filter(function (_, rowIndex) { return rowIndex !== index; }) });
											}}
										>
											Убрать
										</button>
									</div>
								);
							})}
							<button
								type="button"
								className={styles.btn}
								onClick={function () {
									patch({
										cycle: draft.cycle.concat([{ id: 'CLOUDS', chance: 10, minMin: 10, maxMin: 25 }]),
									});
								}}
							>
								Добавить погоду
							</button>
						</section>
						<div className={styles.actions}>
							<button
								type="button"
								className={styles.primary}
								onClick={function () {
									send('patch', {
										id: zone.id,
										name: draft.name,
										color: draft.color,
										priority: Number(draft.priority),
										enabled: draft.enabled,
										minZ: Number(draft.minZ),
										maxZ: Number(draft.maxZ),
										transitionSec: Number(draft.transitionSec),
										followForecast: draft.followForecast,
										clock: draft.clock,
										cycle: draft.cycle,
									});
								}}
							>
								Сохранить зону
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.danger}`}
								onClick={function () { send('delete', { id: zone.id }); }}
							>
								Удалить
							</button>
						</div>
					</>
				) : (
					<p>Создайте зону на своей позиции.</p>
				)}
			</div>
		</div>
	);
}

export default memo(Zones);
