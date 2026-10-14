import React, { memo } from 'react';
import styles from './index.module.css';
import { prettyMoney, useHudStore } from '../../store';
import cashImg from '@imgs/hud/cash.svg';
import creditCardImg from '@imgs/hud/credit-card.svg';

function Time() {
	const time = useHudStore(state => state.time);
	return <div className={styles.time}>{time}</div>;
}

function DateLabel() {
	const date = useHudStore(state => state.date);
	return <div className={styles.date}>{date}</div>;
}

const TimeView = memo(Time);
const DateView = memo(DateLabel);

function Money() {
	const cash = useHudStore(state => state.cash);
	const bank = useHudStore(state => state.bank);

	return (
		<div className={`${styles.money} ${styles.block}`}>
			<div className={styles.cash}>
				<img src={cashImg} alt="" />
				{prettyMoney(cash)} $
			</div>
			<TimeView />
			<div className={styles.bank}>
				<img src={creditCardImg} alt="" />
				{prettyMoney(bank)} $
			</div>
			<DateView />
		</div>
	);
}

export default memo(Money);
