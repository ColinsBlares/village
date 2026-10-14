import React, { memo } from 'react';
import styles from './index.module.css';
import loginIcon from '@imgs/auth/login.png';
import passwordIcon from '@imgs/auth/password.png';
import { setAuthField, submitRecovery, useAuthStore } from '../../store';

function onEnter(event: React.KeyboardEvent<HTMLInputElement>) {
	if (event.key === 'Enter') {
		submitRecovery();
	}
}

function RecoveryFields() {
	const loginOrEmail = useAuthStore(state => state.loginOrEmail);
	const code = useAuthStore(state => state.code);
	const password = useAuthStore(state => state.password);
	const password2 = useAuthStore(state => state.password2);
	const recoveryCodeSent = useAuthStore(state => state.recoveryCodeSent);
	const recoveryCodeConfirmed = useAuthStore(state => state.recoveryCodeConfirmed);

	return (
		<div className={styles.form}>
			{recoveryCodeSent || recoveryCodeConfirmed ? null : (
				<label className={styles.label}>
					Логин или Email
					<input
						className={styles.input}
						type="text"
						value={loginOrEmail}
						autoFocus
						onChange={function (event) {
							setAuthField('loginOrEmail', event.target.value);
						}}
						onKeyUp={onEnter}
					/>
					<img className={`${styles.icon} ${styles.iconLogin}`} src={loginIcon} alt="" />
				</label>
			)}
			{recoveryCodeSent ? (
				<label className={styles.label}>
					Код подтверждения
					<input
						className={styles.input}
						type="text"
						value={code}
						onChange={function (event) {
							setAuthField('code', event.target.value);
						}}
						onKeyUp={onEnter}
					/>
					<img className={`${styles.icon} ${styles.iconPassword}`} src={passwordIcon} alt="" />
				</label>
			) : null}
			{recoveryCodeConfirmed ? (
				<label className={styles.label}>
					Пароль
					<input
						className={styles.input}
						type="text"
						value={password}
						onChange={function (event) {
							setAuthField('password', event.target.value);
						}}
						onKeyUp={onEnter}
					/>
					<img className={`${styles.icon} ${styles.iconPassword}`} src={passwordIcon} alt="" />
				</label>
			) : null}
			{recoveryCodeConfirmed ? (
				<label className={styles.label}>
					Повторите пароль
					<input
						className={styles.input}
						type="text"
						value={password2}
						onChange={function (event) {
							setAuthField('password2', event.target.value);
						}}
						onKeyUp={onEnter}
					/>
				</label>
			) : null}
			<a
				className={styles.switchLink}
				onClick={function () {
					setAuthField('form', 0);
				}}
			>
				Войти в аккаунт
			</a>
			<button className={styles.button} type="button" onClick={submitRecovery}>
				Далее
			</button>
		</div>
	);
}

const RecoveryFieldsView = memo(RecoveryFields);

function RecoveryForm() {
	const form = useAuthStore(state => state.form);
	if (form !== 2) {
		return null;
	}
	return <RecoveryFieldsView />;
}

export default memo(RecoveryForm);
