import React, { memo } from 'react';
import styles from './index.module.css';
import loginIcon from '@imgs/auth/login.png';
import passwordIcon from '@imgs/auth/password.png';
import { setAuthField, submitLogin, useAuthStore } from '../../store';

function onEnter(event: React.KeyboardEvent<HTMLInputElement>) {
	if (event.key === 'Enter') {
		submitLogin();
	}
}

function LoginFields() {
	const loginOrEmail = useAuthStore(state => state.loginOrEmail);
	const password = useAuthStore(state => state.password);
	const rememberMe = useAuthStore(state => state.rememberMe);
	const recoveryCompleted = useAuthStore(state => state.recoveryCompleted);

	return (
		<div className={styles.form}>
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
			<label className={styles.label}>
				Пароль
				<input
					className={styles.input}
					type="password"
					value={password}
					onChange={function (event) {
						setAuthField('password', event.target.value);
					}}
					onKeyUp={onEnter}
				/>
				<img className={`${styles.icon} ${styles.iconPassword}`} src={passwordIcon} alt="" />
			</label>
			<label className={styles.rememberMe}>
				<input
					type="checkbox"
					checked={rememberMe}
					onChange={function (event) {
						setAuthField('rememberMe', event.target.checked);
					}}
				/>
				<span>Запомнить меня</span>
			</label>
			{recoveryCompleted ? null : (
				<a
					className={styles.recoveryLink}
					onClick={function () {
						setAuthField('form', 2);
					}}
				>
					Забыли пароль?
				</a>
			)}
			<a
				className={styles.regLink}
				onClick={function () {
					setAuthField('form', 1);
				}}
			>
				Создать аккаунт
			</a>
			<button className={styles.button} type="button" onClick={submitLogin}>
				Далее
			</button>
		</div>
	);
}

const LoginFieldsView = memo(LoginFields);

function LoginForm() {
	const form = useAuthStore(state => state.form);
	if (form !== 0) {
		return null;
	}
	return <LoginFieldsView />;
}

export default memo(LoginForm);
