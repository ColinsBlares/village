import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';
import { usePlayerMenuStore } from '../../../playerMenu/store';
import logoImg from '@imgs/hud/logo.png';
import QuestTracker from '../QuestTracker';

function shortDate(date: string) {
	const parts = date.split('.');
	if (parts.length === 3 && parts[2].length === 4) {
		return parts[0] + '.' + parts[1] + '.' + parts[2].slice(2);
	}
	return date;
}

function moneyDots(val: number) {
	return String(val).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1.');
}

function Clock() {
	const date = useHudStore(state => state.date);
	const time = useHudStore(state => state.time);

	return (
		<div className={styles.clock}>
			<div className={styles.date}>{shortDate(date)}</div>
			<div className={styles.time}>{time}</div>
		</div>
	);
}

function Brand() {
	return (
		<div className={styles.brand}>
			<div className={styles.title}>VILLAGE</div>
			<div className={styles.server}>Server 1</div>
		</div>
	);
}

function Logo() {
	return (
		<div className={styles.logoWrap}>
			{/* <img className={styles.logo} src={logoImg} alt='' /> */}
		</div>
	);
}

function Status() {
	const players = useHudStore(state => state.players);
	const playerId = useHudStore(state => state.playerId);
	const name = usePlayerMenuStore(state => state.name);

	return (
		<div className={styles.status}>
			<div className={styles.dot} />
			<div className={styles.online}>{players}</div>
			<div className={styles.idLabel}>ID</div>
			<div className={styles.playerId}>{playerId}</div>
			{name ? <div className={styles.nick}>( {name} )</div> : null}
		</div>
	);
}

function WalletIcon() {
	return (
		<div className={styles.wallet} aria-hidden='true'>
			<div className={styles.walletFlap} />
			<div className={styles.walletBody} />
			<div className={styles.walletClasp} />
		</div>
	);
}

function CardIcon() {
	return (
		<div className={styles.card} aria-hidden='true'>
			<div className={styles.cardTop} />
			<div className={styles.cardMark} />
			<div className={styles.cardBottom}>
				<div className={styles.cardStripe} />
			</div>
		</div>
	);
}

function Cash() {
	const cash = useHudStore(state => state.cash);

	return (
		<div className={`${styles.funds} ${styles.cash}`}>
			<div className={styles.fundsMain}>
				<div className={styles.sign}>$</div>
				<div className={styles.amount}>{moneyDots(cash)}</div>
			</div>
			<div className={styles.fundsLabel}>
				<WalletIcon />
				<span>Наличные</span>
			</div>
			<div className={styles.bar} />
		</div>
	);
}

function Bank() {
	const bank = useHudStore(state => state.bank);

	return (
		<div className={`${styles.funds} ${styles.bank}`}>
			<div className={styles.fundsMain}>
				<div className={styles.sign}>$</div>
				<div className={styles.amount}>{moneyDots(bank)}</div>
			</div>
			<div className={styles.fundsLabel}>
				<CardIcon />
				<span>В банке</span>
			</div>
			<div className={styles.bar} />
		</div>
	);
}

const ClockView = memo(Clock);
const BrandView = memo(Brand);
const LogoView = memo(Logo);
const StatusView = memo(Status);
const CashView = memo(Cash);
const BankView = memo(Bank);

function Info() {
	return (
		<div className={styles.root}>
			<div className={styles.clockWrapper}>
				<ClockView />
				<div className={styles.bar}></div>
				<BrandView />
				<LogoView />
			</div>
			<StatusView />
			<CashView />
			<BankView />
			<QuestTracker />
		</div>
	);
}

export default memo(Info);
