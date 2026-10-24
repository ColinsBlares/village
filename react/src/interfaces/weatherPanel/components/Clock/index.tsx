import React, { memo, useEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import { lockTime, previewTime, skyFrom, useWeatherPanelStore } from '../../store';
import { send } from '../../mp';

const PRESETS = [
	{ label: 'Рассвет', hour: 6, minute: 20 },
	{ label: 'Полдень', hour: 12, minute: 0 },
	{ label: 'Закат', hour: 19, minute: 10 },
	{ label: 'Ночь', hour: 0, minute: 0 },
];

function pad(value: number) {
	return value < 10 ? '0' + value : String(value);
}

function Clock() {
	const time = useWeatherPanelStore(state => state.time);
	const [view, setView] = useState(function () {
		return skyFrom(time, 0);
	});
	const timer = useRef(0);
	const pending = useRef<{ [key: string]: number | boolean }>({});

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

	function queue(partial: { [key: string]: number | boolean }, replace?: boolean) {
		previewTime(partial);
		pending.current = replace ? partial : Object.assign({}, pending.current, partial);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(function () {
			const body = pending.current;
			pending.current = {};
			lockTime(false);
			send('time', body);
		}, 160);
	}

	return (
		<div className={styles.wrap}>
			<p className={styles.clock}>{pad(view.hour)}:{pad(view.minute)}</p>
			<p className={styles.note}>
				{time.realtime ? 'Сейчас часы сервера. Сдвиг часа отключает это и оставляет ваше время.' : 'Своё время. Payday по-прежнему считает реальный час.'}
			</p>
			<div className={styles.presets}>
				{PRESETS.map(function (item) {
					return (
						<button
							key={item.label}
							type="button"
							className={styles.btn}
							onClick={function () {
								queue({ hour: item.hour, minute: item.minute, realtime: false });
							}}
						>
							{item.label}
						</button>
					);
				})}
				<button
					type="button"
					className={time.realtime ? styles.btnOn : styles.btn}
					onClick={function () {
						queue({ realtime: true }, true);
					}}
				>
					Как на сервере
				</button>
				<button
					type="button"
					className={time.frozen ? styles.btnOn : styles.btn}
					onClick={function () {
						queue({ frozen: !time.frozen, realtime: false });
					}}
				>
					{time.frozen ? 'Часы стоят' : 'Остановить'}
				</button>
			</div>
			<label className={styles.field}>
				Час {time.hour}
				<input
					type="range"
					min={0}
					max={23}
					value={time.hour}
					onPointerDown={function () { lockTime(true); }}
					onChange={function (event) {
						queue({ hour: Number(event.target.value) });
					}}
				/>
			</label>
			<label className={styles.field}>
				Минута {time.minute}
				<input
					type="range"
					min={0}
					max={59}
					value={time.minute}
					onPointerDown={function () { lockTime(true); }}
					onChange={function (event) {
						queue({ minute: Number(event.target.value) });
					}}
				/>
			</label>
			<label className={styles.field}>
				Скорость: {time.scale} игровых минут за реальную минуту
				<input
					type="range"
					min={0}
					max={60}
					value={time.scale}
					onPointerDown={function () { lockTime(true); }}
					onChange={function (event) {
						queue({ scale: Number(event.target.value), realtime: false });
					}}
				/>
			</label>
		</div>
	);
}

export default memo(Clock);
