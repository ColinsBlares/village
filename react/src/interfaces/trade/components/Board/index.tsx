import React, { memo } from 'react';
import Pocket from '../../../inventory/components/Pocket';
import { TRADE_GIVE, TRADE_TAKE, tradePlace } from '../../grids';
import { useTradeStore } from '../../store';
import Cash from '../Cash';
import Confirm from '../Confirm';
import styles from './index.module.css';

function money(value: number) {
	return String(value).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

function Board() {
	const show = useTradeStore(function (state) {
		return state.show;
	});
	const partnerName = useTradeStore(function (state) {
		return state.partnerName;
	});
	const offerItems = useTradeStore(function (state) {
		return state.offerItems;
	});
	const theirItems = useTradeStore(function (state) {
		return state.theirItems;
	});
	const theirCash = useTradeStore(function (state) {
		return state.theirCash;
	});

	if (!show) return null;

	return (
		<div className={styles.board}>
			<div className={styles.top}>
				<div className={styles.topTitle}>Обмен</div>
				<div className={styles.partner}>{partnerName}</div>
			</div>
			<div className={styles.body}>
				<div className={styles.header}>
					<div className={styles.headerTitle}>Отдаю</div>
				</div>
				<Pocket place={tradePlace(TRADE_GIVE, offerItems)} scope="environment" contextMenu={false} />
				<Cash />
				<div className={styles.header}>
					<div className={styles.headerTitle}>Получаю</div>
					<div className={styles.money}>${money(theirCash)}</div>
				</div>
				<Pocket place={tradePlace(TRADE_TAKE, theirItems)} scope="environment" contextMenu={false} readonly />
			</div>
			<Confirm />
		</div>
	);
}

export default memo(Board);
