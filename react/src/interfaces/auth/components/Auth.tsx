import React, { memo } from 'react';
import styles from './Auth.module.css';
import Header from './Header';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import RecoveryForm from './RecoveryForm';
import ConfirmEmail from './ConfirmEmail';
import Prompt from './Prompt';
import Updates from './Updates';

function Auth() {
	return (
		<div className={styles.auth}>
			<div className={styles.content}>
				<Header />
				<LoginForm />
				<RegisterForm />
				<RecoveryForm />
				<ConfirmEmail />
				<Prompt />
			</div>
			<Updates />
		</div>
	);
}

export default memo(Auth);
