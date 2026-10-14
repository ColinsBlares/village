import React, { memo } from 'react';
import styles from './index.module.css';
import logoImg from '@imgs/auth/logo.png';
import { getAuthHeader, useAuthStore } from '../../store';

function Header() {
	const form = useAuthStore(state => state.form);

	return (
		<div>
			<div className={styles.logoWrap}>
				<img className={styles.logo} src={logoImg} alt="" />
			</div>
			<div className={styles.header}>{getAuthHeader(form)}</div>
		</div>
	);
}

export default memo(Header);
