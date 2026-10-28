import React, { memo, useEffect } from 'react';
import logo from '@imgs/phone/taxi/logo.png';
import logoDark from '@imgs/phone/taxi/logo-dark.png';
import { gameReady, gameTrigger } from '../game';
import { taxiClasses } from './data';
import {
	cancelTaxi,
	closeTaxiResult,
	confirmTaxi,
	loadTaxiLocation,
	pickClass,
	searchTaxi,
	useTaxiStore,
} from './store';
import styles from './index.module.css';

function Arrow() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M4 9h10M10 5l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function BackArrow() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M14 9H4M8 5 4 9l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function Cross() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
			<path d="M3 3l8 8M11 3 3 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
		</svg>
	);
}

function Home() {
	const classId = useTaxiStore(state => state.classId);

	return (
		<div className={styles.home}>
			<img className={styles.logo} src={logo} alt="Downtown Cab Co." draggable={false} />
			<p className={styles.caption}>Выберите необходимый класс авто</p>
			<div className={styles.list}>
				{taxiClasses.map(function (item) {
					const on = item.id === classId;
					return (
						<button
							key={item.id}
							type="button"
							className={on ? styles.card + ' ' + styles.on : styles.card}
							onClick={function () {
								pickClass(item.id);
							}}
						>
							<span>
								<strong>{item.name}</strong>
								<em>{item.price}</em>
							</span>
							<img src={item.car} alt="" draggable={false} />
						</button>
					);
				})}
			</div>
			<button type="button" className={styles.go} onClick={searchTaxi}>
				<span>Заказать такси</span>
				<Arrow />
			</button>
		</div>
	);
}

const HomeView = memo(Home);

function Sheet() {
	const screen = useTaxiStore(state => state.screen);
	const order = useTaxiStore(state => state.order);
	const reason = useTaxiStore(state => state.reason);
	const classId = useTaxiStore(state => state.classId);
	const car = taxiClasses.find(function (item) {
		return item.id === classId;
	}) || taxiClasses[0];
	const fail = screen === 'fail';
	const found = screen === 'found';
	const confirm = !!(order && order.isSelect && !order.isWay);
	let title = 'Поиск такси';
	let text = 'Как только таксист будет найден,\nвам прийдёт оповещение';
	if (fail) {
		title = 'Заказ отменен';
		text = reason;
	} else if (found && order && order.isWay) {
		title = 'Такси найдено';
		text = order.street ? 'Едем: ' + order.street : 'В пути';
	} else if (found && order && order.isSelect) {
		title = 'Такси найдено';
		text = (order.street || 'Точка') + (order.price != null ? '\n$' + order.price : '');
	} else if (found && order && order.isInTaxi) {
		title = 'Такси найдено';
		text = 'Отметьте точку на карте';
	} else if (found && order && order.isReady) {
		title = 'Такси найдено';
		text = 'Машина на месте, садитесь';
	} else if (found) {
		title = 'Такси найдено';
		text = 'К вам приедет ' + ((order && order.model) || car.name);
	}
	const tone = fail ? styles.bad : found ? styles.ok : styles.wait;

	return (
		<div className={styles.sheet + ' ' + tone}>
			<span className={styles.glow + ' ' + styles.g1} />
			<span className={styles.glow + ' ' + styles.g2} />
			<span className={styles.glow + ' ' + styles.g3} />
			<img className={styles.mark} src={logoDark} alt="" draggable={false} />
			<p className={styles.tariff}>Тариф</p>
			<p className={styles.className}>{car.name}</p>
			<img className={styles.car} src={car.car} alt="" draggable={false} />
			<p className={styles.note}>
				<strong>{title}</strong>
				<span>{text}</span>
			</p>
			<button
				type="button"
				className={styles.bar}
				onClick={fail ? closeTaxiResult : confirm ? confirmTaxi : cancelTaxi}
			>
				<span>{fail ? 'Вернуться' : confirm ? 'Подтвердить' : 'Отменить заказ'}</span>
				{fail ? <BackArrow /> : confirm ? <Arrow /> : <Cross />}
			</button>
		</div>
	);
}

const SheetView = memo(Sheet);

function TaxiApp() {
	const screen = useTaxiStore(state => state.screen);

	useEffect(function () {
		gameTrigger('taxi.client.app.open');
		if (!gameReady() && !useTaxiStore.getState().location) {
			loadTaxiLocation('Вайнвуд', 'Бульвар');
		}
	}, []);

	if (screen === 'home') {
		return <HomeView />;
	}
	return <SheetView />;
}

export default memo(TaxiApp);
