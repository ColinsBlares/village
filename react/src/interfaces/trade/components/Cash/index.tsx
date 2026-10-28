import React, { memo } from 'react';
import styles from './index.module.css';
import { setCashDraft, setCashFocus, useTradeStore } from '../../store';

function money(value: number) {
	return String(value).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

function Cash() {
	const wallet = useTradeStore(function (state) {
		return state.cash;
	});
	const draft = useTradeStore(function (state) {
		return state.cashDraft;
	});

	return (
		<div className={styles.cash}>
			<div className={styles.wallet}>
				<span>На руках</span>
				<span className={styles.sum}>${money(wallet)}</span>
			</div>
			<label className={styles.field}>
				<span>Отдаю</span>
				<input
					className={styles.input}
					inputMode="numeric"
					value={draft}
					onChange={function (event) { setCashDraft(event.target.value); }}
					onFocus={function () { setCashFocus(true); }}
					onBlur={function () { setCashFocus(false); }}
				/>
			</label>
		</div>
	);
}

export default memo(Cash);
