import React, { memo } from 'react';
import styles from './index.module.css';
import loginIcon from '@imgs/auth/login.png';
import emailIcon from '@imgs/auth/email.png';
import passwordIcon from '@imgs/auth/password.png';
import { setAuthField, submitRegister, useAuthStore } from '../../store';

function onEnter(event: React.KeyboardEvent<HTMLInputElement>) {
	if (event.key === 'Enter') {
		submitRegister();
	}
}

function RegisterFields() {
	const login = useAuthStore(state => state.login);
	const email = useAuthStore(state => state.email);
	const password = useAuthStore(state => state.password);
	const password2 = useAuthStore(state => state.password2);

	return (
		<div className={styles.form}>
			<label className={styles.label}>
				Логин
				<input
					className={styles.input}
					type="text"
					value={login}
					autoFocus
					onChange={function (event) {
						setAuthField('login', event.target.value);
					}}
					onKeyUp={onEnter}
				/>
				<img className={`${styles.icon} ${styles.iconLogin}`} src={loginIcon} alt="" />
			</label>
			<label className={styles.label}>
				Email
				<input
					className={styles.input}
					type="text"
					value={email}
					onChange={function (event) {
						setAuthField('email', event.target.value);
					}}
					onKeyUp={onEnter}
				/>
				<img className={`${styles.icon} ${styles.iconEmail}`} src={emailIcon} alt="" />
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
			<label className={styles.label}>
				Повторите пароль
				<input
					className={styles.input}
					type="password"
					value={password2}
					onChange={function (event) {
						setAuthField('password2', event.target.value);
					}}
					onKeyUp={onEnter}
				/>
				<img className={`${styles.icon} ${styles.iconPassword2}`} src={passwordIcon} alt="" />
			</label>
			<a
				className={styles.switchLink}
				onClick={function () {
					setAuthField('form', 0);
				}}
			>
				Войти в аккаунт
			</a>
			<button
				className={styles.button}
				type="button"
				onClick={function () {
					submitRegister(-1);
				}}
			>
				Далее
			</button>
		</div>
	);
}

const RegisterFieldsView = memo(RegisterFields);

function RegisterForm() {
	const form = useAuthStore(state => state.form);
	if (form !== 1) {
		return null;
	}
	return <RegisterFieldsView />;
}

export default memo(RegisterForm);
