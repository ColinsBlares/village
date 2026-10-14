import React, { memo, useState } from 'react';
import fibLogo from '@imgs/mapCase/fib-logo.svg';
import pdLogo from '@imgs/mapCase/pd-logo.svg';
import { getFactionData } from '../../data';
import { setInputFocus, showLoad, useMapCaseStore } from '../../store';
import styles from './index.module.css';

const MODES = ['phone', 'name', 'car'];
const LABELS: Record<string, string> = {
	phone: 'Номер телефона',
	name: 'Имя или/и фамилия',
	car: 'Номер автомобиля',
};
const HINTS: Record<string, string> = {
	phone: 'Введите номер телефона...',
	name: 'Введите имя или/и фамилию...',
	car: 'Введите номер автомобиля...',
};
const CHECKS: Record<string, RegExp> = {
	phone: /[0-9]/,
	name: /[a-zA-Z ]/,
	car: /[0-9a-zA-Z]/,
};

function DbSearch() {
	const type = useMapCaseStore(state => state.type);
	const [mode, setMode] = useState('phone');
	const [values, setValues] = useState<Record<string, string>>({ phone: '', name: '', car: '' });
	const logo = type === 'fib' ? fibLogo : pdLogo;

	function search() {
		const value = values[mode];
		if (!value) return;
		const data = getFactionData(useMapCaseStore.getState().type);
		if (!data) return;
		const api = data.windowsData.dbSearch;
		showLoad();
		if (mode === 'phone') api.searchByPhone(value);
		else if (mode === 'name') api.searchByName(value);
		else if (mode === 'car') api.searchByCar(value);
		setValues(function (prev) {
			const next = Object.assign({}, prev);
			next[mode] = '';
			return next;
		});
	}

	function onKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
		if (!CHECKS[mode].test(event.key)) event.preventDefault();
		if (event.keyCode == 13 && !useMapCaseStore.getState().loadMod) search();
	}

	return (
		<div className={styles.root}>
			<div className={styles.logo}>
				<img src={logo} alt="" />
			</div>
			<div className={styles.title}>ПОИСК ПО БАЗЕ ДАННЫХ</div>
			<div className={styles.menu}>
				<div className={styles.mainLine} />
				{MODES.map(function (item, index) {
					const focused = mode === item;
					return (
						<React.Fragment key={item}>
							{index > 0 ? <div /> : null}
							<div
								className={focused ? styles.focus : undefined}
								onClick={function () { setMode(item); }}
							>
								<div>{LABELS[item]}</div>
								<div className={styles.line} />
							</div>
						</React.Fragment>
					);
				})}
			</div>
			<div>
				<input
					className={styles.input}
					placeholder={HINTS[mode]}
					value={values[mode]}
					onChange={function (event) { const text = event.target.value; setValues(function (prev) { const next = Object.assign({}, prev); next[mode] = text; return next; }); }}
					onKeyPress={onKeyPress}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div className={styles.search} onClick={search}>Поиск</div>
		</div>
	);
}

export default memo(DbSearch);
