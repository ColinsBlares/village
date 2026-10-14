import React, { memo } from 'react';
import styles from './index.module.css';
import { addSlot, showConfirmWindow, usePlayerMenuStore } from '../../store';

function DonateAddSlot() {
	const active = usePlayerMenuStore(state => state.donateWindow === 'donate-addslot');
	const amountSlots = usePlayerMenuStore(state => state.amountSlots);
	const maxSlots = usePlayerMenuStore(state => state.maxSlots);
	const price = usePlayerMenuStore(state => state.slotPrice);
	const coins = usePlayerMenuStore(state => state.coins);
	const disabled = amountSlots == maxSlots || price > coins;

	function onClick() {
		if (amountSlots == maxSlots) return;
		if (price > coins) return;
		showConfirmWindow(
			'Подтверждение действия',
			'Вы действительно хотите <br />\n                добавить слот?\n                ',
			addSlot,
		);
	}

	const className = active ? styles.root : styles.root + ' ' + styles.hidden;
	const btnClass = disabled ? styles.btn + ' ' + styles.disable : styles.btn;

	return (
		<div className={className}>
			<div className={styles.head}>Добавление слота</div>
			<div className={styles.hint}>Добавьте слот для создания нового персонажа</div>
			<div className={styles.info}>Слотов: {amountSlots}</div>
			<div className={styles.price}>
				Стоимость услуги: <span>{price} CC</span>
			</div>
			<div className={btnClass} onClick={onClick}>
				Добавить слот
			</div>
		</div>
	);
}

export default memo(DonateAddSlot);
