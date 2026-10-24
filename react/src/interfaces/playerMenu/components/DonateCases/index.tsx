import React, { memo } from 'react';
import styles from './index.module.css';
import {
	buyDonateCase,
	clearDonateCaseResult,
	showConfirmWindow,
	usePlayerMenuStore,
} from '../../store';

const cases = [
	{
		id: 'bronze',
		name: 'Бронзовый кейс',
		price: 100,
		prize: 'от $5 000 до $25 000',
		tier: styles.bronze,
	},
	{
		id: 'silver',
		name: 'Серебряный кейс',
		price: 300,
		prize: 'от $25 000 до $100 000',
		tier: styles.silver,
	},
	{
		id: 'gold',
		name: 'Золотой кейс',
		price: 700,
		prize: 'от $50 000 до $500 000',
		tier: styles.gold,
	},
];

function DonateCases() {
	const active = usePlayerMenuStore(state => state.donateWindow === 'donate-cases');
	const coins = usePlayerMenuStore(state => state.coins);
	const opening = usePlayerMenuStore(state => state.donateCaseOpening);
	const result = usePlayerMenuStore(state => state.donateCaseResult);
	const className = active ? styles.root : `${styles.root} ${styles.hidden}`;

	function confirmPurchase(item: typeof cases[number]) {
		if (opening || coins < item.price) return;
		showConfirmWindow(
			'Покупка донат-кейса',
			`Купить и открыть «${item.name}» за <span style="color:#FFDF29">${item.price} CC</span>?`,
			() => buyDonateCase(item.id),
		);
	}

	return (
		<div className={className}>
			<div className={styles.head}>Донат-кейсы</div>
			<div className={styles.description}>
				Купите кейс за CC и сразу откройте его. Награда в виде наличных зачисляется персонажу.
			</div>
			<div className={styles.balance}>Баланс: <strong>{coins.toLocaleString('ru-RU')} CC</strong></div>
			<div className={styles.list}>
				{cases.map(item => (
					<article className={`${styles.card} ${item.tier}`} key={item.id}>
						<div className={styles.caseIcon}><span>✦</span></div>
						<div className={styles.caseInfo}>
							<strong>{item.name}</strong>
							<p>Денежная награда: {item.prize}</p>
							<small>Случайный выигрыш · одно открытие</small>
						</div>
						<div className={styles.buyArea}>
							<span>{item.price} CC</span>
							<button
								type="button"
								disabled={opening || coins < item.price}
								onClick={() => confirmPurchase(item)}
							>
								{opening ? 'Открываем...' : coins < item.price ? 'Недостаточно CC' : 'Купить и открыть'}
							</button>
						</div>
					</article>
				))}
			</div>
			{opening && (
				<div className={styles.resultOverlay}>
					<div className={`${styles.resultDialog} ${styles.opening}`}>
						<div className={styles.resultCase}><span>✦</span></div>
						<strong>Открываем кейс</strong>
						<p>Удача уже близко...</p>
					</div>
				</div>
			)}
			{result && (
				<div className={styles.resultOverlay}>
					<div className={`${styles.resultDialog} ${styles.revealed}`} role="dialog" aria-modal="true">
						<div className={styles.resultCase}><span>✦</span></div>
						<strong>{result.caseName}</strong>
						<p>Вам выпало</p>
						<b>${result.prize.toLocaleString('ru-RU')}</b>
						<button type="button" onClick={clearDonateCaseResult}>Продолжить</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default memo(DonateCases);
