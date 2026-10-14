import React, { memo, useEffect, useRef } from 'react';
import styles from './index.module.css';
import { formatPrice } from '../../catalog';
import { changeNumber, setShopEditing, setShopNumber, shopBack, useSupermarketStore } from '../../store';

function NumberPanel() {
	const number = useSupermarketStore(state => state.number);
	const prices = useSupermarketStore(state => state.prices);
	const ref = useRef<HTMLInputElement>(null);

	useEffect(function () {
		if (ref.current) ref.current.focus();
	}, []);

	return (
		<div className={styles.panel}>
			<h2>Смена номера</h2>
			<p>Номер из 6 цифр, без нуля в начале. Стоимость {formatPrice(prices.numberChange)}</p>
			<input
				ref={ref}
				type="text"
				maxLength={6}
				value={number}
				placeholder="123456"
				onChange={function (e) {
					setShopNumber(e.target.value);
				}}
				onFocus={function () {
					setShopEditing(true);
				}}
				onBlur={function () {
					setShopEditing(false);
				}}
				onKeyUp={function (e) {
					if (e.keyCode === 13) changeNumber();
				}}
			/>
			<div className={styles.actions}>
				<button className={styles.buy} onClick={changeNumber}>
					Сменить
				</button>
				<button className={styles.link} onClick={shopBack}>
					Назад к товарам
				</button>
			</div>
		</div>
	);
}

export default memo(NumberPanel);
