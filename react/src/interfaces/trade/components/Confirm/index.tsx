import React, { memo } from 'react';
import styles from './index.module.css';
import { cancelTrade, confirmTrade, toggleReady, useTradeStore } from '../../store';

function Confirm() {
	const ready = useTradeStore(function (state) {
		return state.ready;
	});
	const confirm = useTradeStore(function (state) {
		return state.confirm;
	});
	const theirReady = useTradeStore(function (state) {
		return state.theirReady;
	});
	const theirConfirm = useTradeStore(function (state) {
		return state.theirConfirm;
	});

	let status = 'Перетащите вещи в «Отдаю»';
	if (confirm) status = 'Ждём вторую сторону';
	else if (ready && theirReady) status = 'Можно обменивать';
	else if (ready) status = 'Вы готовы';
	else if (theirReady) status = 'Вторая сторона готова';

	return (
		<div className={styles.confirm}>
			<div className={styles.status}>{status}</div>
			<div className={styles.buttons}>
				<button className={styles.ghost} type="button" onClick={cancelTrade}>Отмена</button>
				<button className={ready ? styles.readyOn : styles.ready} type="button" onClick={toggleReady}>
					{ready ? 'Не готов' : 'Готов'}
				</button>
				<button className={styles.trade} type="button" disabled={!(ready && theirReady && !confirm)} onClick={confirmTrade}>
					{theirConfirm && !confirm ? 'Подтвердить' : 'Обменять'}
				</button>
			</div>
		</div>
	);
}

export default memo(Confirm);
