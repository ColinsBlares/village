import React, { memo, useState } from 'react';
import { getFactionData } from '../../data';
import { setCurrentOverWindow, setInputFocus, showLoad, useMapCaseStore } from '../../store';
import styles from './index.module.css';

function OverFine() {
	const type = useMapCaseStore(state => state.type);
	const menuFocus = useMapCaseStore(state => state.menuFocus);
	const [cause, setCause] = useState('');
	const [amount, setAmount] = useState('');
	const data = getFactionData(type);
	const profileRoot = data ? data.windowsData.profile : null;
	const profile = profileRoot ? profileRoot.profileData[menuFocus] || {} : {};

	function give() {
		if (!cause || !amount || !profileRoot) return;
		showLoad();
		setCurrentOverWindow(null);
		profileRoot.giveFine(cause, amount, profile);
		setCause('');
		setAmount('');
	}

	function onKeyPress(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.keyCode == 13 && !useMapCaseStore.getState().loadMod) give();
	}

	function onAmount(event: React.KeyboardEvent<HTMLInputElement>) {
		if (!/[0-9]/.test(event.key)) event.preventDefault();
	}

	return (
		<div className={styles.box} onKeyPress={onKeyPress}>
			<div className={styles.header}> Выдача штрафа {profile.name}</div>
			<div className={styles.title}>Введите причину</div>
			<div className={styles.input}>
				<input
					maxLength={30}
					placeholder="Введите причину выдачи штрафа..."
					value={cause}
					onChange={function (event) { setCause(event.target.value); }}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div className={styles.title}>Введите сумму штрафа</div>
			<div className={styles.input}>
				<input
					placeholder="Введите сумму..."
					value={amount}
					onChange={function (event) { setAmount(event.target.value); }}
					onKeyPress={onAmount}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div className={styles.btns}>
				<div className={styles.btn} onClick={give}>Выдать</div>
				<div className={styles.btn} onClick={function () { setCurrentOverWindow(null); }}>Отмена</div>
			</div>
		</div>
	);
}

export default memo(OverFine);
