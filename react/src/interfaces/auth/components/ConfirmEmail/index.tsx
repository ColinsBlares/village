import React, { memo } from 'react';
import styles from './index.module.css';
import passwordIcon from '@imgs/auth/password.png';
import { confirmEmail, setAuthField, useAuthStore } from '../../store';

function onEnter(event: React.KeyboardEvent<HTMLInputElement>) {
	if (event.key === 'Enter') {
		confirmEmail(1);
	}
}

function ConfirmEmailFields() {
	const code = useAuthStore(state => state.code);

	return (
		<div className={styles.form}>
			<label className={styles.label}>
				Код подтверждения
				<input
					className={styles.input}
					type="text"
					value={code}
					autoFocus
					onChange={function (event) {
						setAuthField('code', event.target.value);
					}}
					onKeyUp={onEnter}
				/>
				<img className={`${styles.icon} ${styles.iconPassword}`} src={passwordIcon} alt="" />
			</label>
			<a
				className={styles.skipLink}
				onClick={function () {
					confirmEmail(0);
				}}
			>
				Пропустить
			</a>
			<button
				className={styles.button}
				type="button"
				onClick={function () {
					confirmEmail(1);
				}}
			>
				Далее
			</button>
		</div>
	);
}

const ConfirmEmailFieldsView = memo(ConfirmEmailFields);

function ConfirmEmail() {
	const form = useAuthStore(state => state.form);
	if (form !== 3) {
		return null;
	}
	return <ConfirmEmailFieldsView />;
}

export default memo(ConfirmEmail);
