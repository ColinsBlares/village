import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { acceptChange, setInputFocus, showConfirmWindow, usePlayerMenuStore } from '../../store';

function DonateChangeName() {
	const active = usePlayerMenuStore(state => state.donateWindow === 'donate-changename');
	const price = usePlayerMenuStore(state => state.nicknamePrice);
	const coins = usePlayerMenuStore(state => state.coins);
	const [firstname, setFirstname] = useState('');
	const [lastname, setLastname] = useState('');
	const disabled = !firstname || !lastname || price > coins;

	function changename() {
		if (!firstname || !lastname) return;
		if (price > coins) return;
		const first = firstname;
		const last = lastname;
		showConfirmWindow(
			'Подтверждение действия',
			'Вы действительно хотите <br />\n                сменить имя и фамилию?\n                ',
			function () {
				acceptChange(first, last);
				setFirstname('');
				setLastname('');
			},
		);
	}

	function onKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			changename();
			return;
		}
		if (!/[a-zA-Z]/.test(event.key)) event.preventDefault();
	}

	const className = active ? styles.root : styles.root + ' ' + styles.hidden;
	const btnClass = disabled ? styles.btn + ' ' + styles.disable : styles.btn;

	return (
		<div className={className}>
			<div className={styles.head}>Смена никнейма</div>
			<div className={styles.hint}>Смените никнейм для вашей новой личности</div>
			<div className={styles.name}>
				<input
					placeholder="Введите новое имя"
					value={firstname}
					onChange={function (event) { setFirstname(event.target.value); }}
					onKeyPress={onKeyPress}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div>
				<input
					placeholder="Введите новую фамилию"
					value={lastname}
					onChange={function (event) { setLastname(event.target.value); }}
					onKeyPress={onKeyPress}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div className={styles.price}>
				Стоимость услуги: <span>{price} CC</span>
			</div>
			<div className={btnClass} onClick={changename}>
				Сменить никнейм
			</div>
		</div>
	);
}

export default memo(DonateChangeName);
