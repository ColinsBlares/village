import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { acceptConvert, setInputFocus, showConfirmWindow, splitMoney, usePlayerMenuStore } from '../../store';

function DonateConvert() {
	const active = usePlayerMenuStore(state => state.donateWindow === 'donate-convert');
	const coefficient = usePlayerMenuStore(state => state.coefficient);
	const coins = usePlayerMenuStore(state => state.coins);
	const [price, setPrice] = useState('');
	const virtualCoins = isNaN(price as any) || (price as any) <= 0 ? 0 : (price as any) * coefficient;
	const isEnable = price && (price as any) != 0 && (price as any) <= coins;

	function convert() {
		if (!isEnable) return;
		const amount = price;
		const virtual = virtualCoins;
		showConfirmWindow(
			'Подтверждение действия',
			'Вы действительно хотите ковертировать <br />\n                <span style="color: #FFDF29">' +
				splitMoney(amount) +
				' CC</span> в\n                <span style="color: #34DE3B">' +
				splitMoney(virtual) +
				' $</span>\n                ',
			function () {
				acceptConvert(amount);
				setPrice('');
			},
		);
	}

	function onKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			convert();
			return;
		}
		if (!/[0-9]/.test(event.key)) event.preventDefault();
	}

	const className = active ? styles.root : styles.root + ' ' + styles.hidden;
	const btnClass = isEnable ? styles.btn : styles.btn + ' ' + styles.disable;

	return (
		<div className={className}>
			<div className={styles.head}>Конвертация валюты</div>
			<div className={styles.hint}>
				Конвертация валюты - это способ получить виртуальную валюту,
				<br />
				обменивая <div className={styles.coin}>cc</div> на неё
			</div>
			<div className={styles.hintSec}>Введите число CC, которые вы бы хотели обменять</div>
			<input
				placeholder="Введите число..."
				value={price}
				onChange={function (event) { setPrice(event.target.value); }}
				onKeyPress={onKeyPress}
				onFocus={function () { setInputFocus(true); }}
				onBlur={function () { setInputFocus(false); }}
			/>
			<div className={styles.equally}>=</div>
			<div className={styles.coins}>{splitMoney(virtualCoins)} $</div>
			<div className={btnClass} onClick={convert}>
				Конвертировать
			</div>
		</div>
	);
}

export default memo(DonateConvert);
