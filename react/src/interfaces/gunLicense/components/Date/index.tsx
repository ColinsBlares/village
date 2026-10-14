import React, { memo } from 'react';
import styles from './index.module.css';
import { useGunLicenseStore } from '../../store';

function DateView() {
	const date = useGunLicenseStore(state => state.date);

	return (
		<div className={styles.date}>
			<div className={styles.key}>Дата выдачи</div>
			<div className={styles.value}>{date}</div>
		</div>
	);
}

export default memo(DateView);
