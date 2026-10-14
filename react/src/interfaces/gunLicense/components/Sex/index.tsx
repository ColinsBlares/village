import React, { memo } from 'react';
import styles from './index.module.css';
import { useGunLicenseStore } from '../../store';

function Sex() {
	const sex = useGunLicenseStore(state => state.sex);

	return (
		<div className={styles.sex}>
			<div className={styles.key}>Пол</div>
			<div className={styles.value}>{sex ? 'Ж' : 'М'}</div>
		</div>
	);
}

export default memo(Sex);
