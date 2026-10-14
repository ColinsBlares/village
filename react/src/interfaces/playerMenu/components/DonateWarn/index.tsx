import React, { memo } from 'react';
import styles from './index.module.css';
import { showConfirmWindow, takeoffWarn, usePlayerMenuStore } from '../../store';

function DonateWarn() {
	const active = usePlayerMenuStore(state => state.donateWindow === 'donate-warn');
	const amountWarns = usePlayerMenuStore(state => state.amountWarns);
	const price = usePlayerMenuStore(state => state.clearWarnPrice);
	const coins = usePlayerMenuStore(state => state.coins);
	const disabled = !amountWarns || price > coins;

	function onClick() {
		if (!amountWarns) return;
		if (price > coins) return;
		showConfirmWindow(
			'Подтверждение действия',
			'Вы действительно хотите <br />\n                снять варн?\n                ',
			takeoffWarn,
		);
	}

	const className = active ? styles.root : styles.root + ' ' + styles.hidden;
	const btnClass = disabled ? styles.btn + ' ' + styles.disable : styles.btn;

	return (
		<div className={className}>
			<div className={styles.head}>Снятие варна</div>
			<div className={styles.hint}>Снимите варн и разблокируйте функции</div>
			{amountWarns ? (
				<div className={styles.info}>Варнов: {amountWarns}</div>
			) : (
				<div className={styles.info + ' ' + styles.none}>На вашем аккаунте нет варнов</div>
			)}
			<div className={styles.price}>
				Стоимость услуги: <span>{price} CC</span>
			</div>
			<div className={btnClass} onClick={onClick}>
				Снять варн
			</div>
		</div>
	);
}

export default memo(DonateWarn);
