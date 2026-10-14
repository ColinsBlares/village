import React, { memo, useEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import {
	cancelMailChange,
	changeMail,
	changePassword,
	checkEmailCode,
	setInputFocus,
	showConfirmWindow,
	startProtectionWait,
	usePlayerMenuStore,
} from '../../store';

const EMAIL_PATTERN = /^([a-z0-9_\.-])+@[a-z0-9-]+\.([a-z]{2,4}\.)?[a-z]{2,4}$/i;

function SettingsProtection() {
	const active = usePlayerMenuStore(state => state.settingsWindow === 'settings-protection');
	const email = usePlayerMenuStore(state => state.email);
	const isConfirmed = usePlayerMenuStore(state => state.isConfirmed);
	const passMessage = usePlayerMenuStore(state => state.passMessage);
	const codeMod = usePlayerMenuStore(state => state.protectionCodeMod);
	const waiting = usePlayerMenuStore(state => state.protectionWaiting);
	const [newEmail, setNewEmail] = useState('');
	const [code, setCode] = useState('');
	const [changeMailMod, setChangeMailMod] = useState(false);
	const [changePassMod, setChangePassMod] = useState(false);
	const [oldPass, setOldPass] = useState('');
	const [newPass, setNewPass] = useState('');
	const [newPass2, setNewPass2] = useState('');
	const mounted = useRef(false);

	useEffect(
		function () {
			if (!mounted.current) {
				mounted.current = true;
				return;
			}
			setCode('');
		},
		[isConfirmed],
	);

	const emailIsValid = EMAIL_PATTERN.test(newEmail);
	const passIsValid = !!(oldPass && newPass && newPass2 && newPass == newPass2);

	function saveMail() {
		if (!emailIsValid) return;
		const mail = newEmail;
		showConfirmWindow(
			'Подтверждение действия',
			'Вы действительно хотите <br />\n                сменить адрес почты?\n                ',
			function () {
				changeMail(mail);
				setNewEmail('');
				setChangeMailMod(false);
			},
		);
	}

	function confCode() {
		if (!code) return;
		checkEmailCode(code);
		setCode('');
	}

	function passCancel() {
		setChangePassMod(false);
		setOldPass('');
		setNewPass('');
		setNewPass2('');
	}

	function savePass() {
		if (!passIsValid) return;
		const oldValue = oldPass;
		const newValue = newPass;
		showConfirmWindow(
			'Подтверждение действия',
			'Вы действительно хотите <br />\n                сменить пароль?\n                ',
			function () {
				changePassword(oldValue, newValue);
				passCancel();
			},
		);
		setChangePassMod(false);
	}

	function cancel() {
		if (!cancelMailChange()) return;
		setChangeMailMod(false);
		setCode('');
		setNewEmail('');
	}

	function onDigit(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			confCode();
			return;
		}
		if (!/[0-9]/.test(event.key)) event.preventDefault();
	}

	const className = active ? styles.root : styles.root + ' ' + styles.hidden;
	const confirmed = !!isConfirmed;

	return (
		<div className={className}>
			<div className={styles.head}>Общие настройки</div>
			<div className={styles.record}>
				<div className={styles.title}>Электронная почта</div>
				<div className={styles.body}>
					{!changeMailMod && !codeMod ? (
						<div>
							<div className={styles.email}>{email}</div>
							<div className={confirmed ? styles.info + ' ' + styles.conf : styles.info}>
								{confirmed ? 'Подтверждена' : 'Не подтверждена'}
							</div>
						</div>
					) : null}
					{changeMailMod ? (
						<input
							placeholder="Введите новый E-Mail"
							value={newEmail}
							onChange={function (event) { setNewEmail(event.target.value); }}
							onKeyPress={function (event) {
								if (event.key === 'Enter') saveMail();
							}}
							onFocus={function () { setInputFocus(true); }}
							onBlur={function () { setInputFocus(false); }}
						/>
					) : null}
					{codeMod ? (
						<input
							placeholder="Введите код"
							value={code}
							onChange={function (event) { setCode(event.target.value); }}
							onKeyPress={onDigit}
							onFocus={function () { setInputFocus(true); }}
							onBlur={function () { setInputFocus(false); }}
						/>
					) : null}
				</div>
				<div className={styles.actions}>
					{!changeMailMod && !codeMod ? <div onClick={function () { setChangeMailMod(true); }}>Изменить</div> : null}
					{!confirmed && !codeMod && !changeMailMod ? <div onClick={startProtectionWait}>Отправить код</div> : null}
					{codeMod ? (
						<div className={code ? undefined : styles.disable} onClick={confCode}>
							Подтвердить
						</div>
					) : null}
					{changeMailMod ? (
						<div className={emailIsValid ? undefined : styles.disable} onClick={saveMail}>
							Сохранить
						</div>
					) : null}
					{changeMailMod || codeMod ? <div onClick={cancel}>Отменить {waiting}</div> : null}
				</div>
			</div>
			<div className={styles.record + ' ' + styles.pass}>
				<div className={styles.title}>Пароль</div>
				<div className={styles.passBody}>
					{!changePassMod ? <div>{passMessage}</div> : null}
					{changePassMod ? (
						<div>
							<input
								type="password"
								placeholder="Введите старый пароль"
								value={oldPass}
								onChange={function (event) { setOldPass(event.target.value); }}
								onKeyPress={function (event) {
									if (event.key === 'Enter') savePass();
								}}
								onFocus={function () { setInputFocus(true); }}
								onBlur={function () { setInputFocus(false); }}
							/>
							<input
								type="password"
								placeholder="Введите новый пароль"
								value={newPass}
								onChange={function (event) { setNewPass(event.target.value); }}
								onKeyPress={function (event) {
									if (event.key === 'Enter') savePass();
								}}
								onFocus={function () { setInputFocus(true); }}
								onBlur={function () { setInputFocus(false); }}
							/>
							<input
								type="password"
								placeholder="Повторно новый пароль"
								value={newPass2}
								onChange={function (event) { setNewPass2(event.target.value); }}
								onKeyPress={function (event) {
									if (event.key === 'Enter') savePass();
								}}
								onFocus={function () { setInputFocus(true); }}
								onBlur={function () { setInputFocus(false); }}
							/>
						</div>
					) : null}
				</div>
				<div className={styles.actions}>
					{!changePassMod ? <div onClick={function () { setChangePassMod(true); }}>Изменить</div> : null}
					{changePassMod ? (
						<div className={passIsValid ? undefined : styles.disable} onClick={savePass}>
							Сохранить
						</div>
					) : null}
					{changePassMod ? <div onClick={passCancel}>Отменить</div> : null}
				</div>
			</div>
		</div>
	);
}

export default memo(SettingsProtection);
