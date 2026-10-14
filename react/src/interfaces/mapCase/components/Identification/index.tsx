import React, { memo, useState } from 'react';
import fibLogo from '@imgs/mapCase/identification-fib.svg';
import pdLogo from '@imgs/mapCase/identification-pd.svg';
import { getFactionData } from '../../data';
import { setInputFocus, showLoad, useMapCaseStore } from '../../store';
import searchStyles from '../DbSearch/index.module.css';
import styles from './index.module.css';

function Identification() {
	const type = useMapCaseStore(state => state.type);
	const [value, setValue] = useState('');
	const logo = type === 'fib' ? fibLogo : pdLogo;

	function search() {
		if (!value) return;
		const data = getFactionData(useMapCaseStore.getState().type);
		if (!data) return;
		const api = data.windowsData.identification;
		showLoad('Держитесь рядом с человеком личность которого пытаетесь установить', api.waitingTime);
		api.searchById(value);
		setValue('');
	}

	function onKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
		if (!/[0-9]/.test(event.key)) event.preventDefault();
		if (event.keyCode == 13 && !useMapCaseStore.getState().loadMod) search();
	}

	return (
		<div className={searchStyles.root}>
			<div className={searchStyles.logo + ' ' + styles.logo}>
				<img src={logo} alt="" />
			</div>
			<div className={searchStyles.title}>УСТАНОВЛЕНИЕ ЛИЧНОСТИ</div>
			<div>
				<input
					className={searchStyles.input}
					placeholder="Введите ID..."
					value={value}
					onChange={function (event) { setValue(event.target.value); }}
					onKeyPress={onKeyPress}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div className={searchStyles.search + ' ' + styles.search} onClick={search}>
				Установить личность
			</div>
		</div>
	);
}

export default memo(Identification);
