import React, { memo } from 'react';
import styles from './index.module.css';
import { getPaddingNumber } from '@utils/cefBridge';
import { useDriverLicenseStore } from '../../store';

function Person() {
	const number = useDriverLicenseStore(state => state.number);
	const name = useDriverLicenseStore(state => state.name);
	const sex = useDriverLicenseStore(state => state.sex);

	return (
		<div className={styles.infoA}>
			<h3 className={styles.title}>Driver License</h3>
			<div className={styles.label}>ID Лицензии</div>
			<div className={styles.value}>{getPaddingNumber(number, 10)}</div>
			<div className={styles.label}>Имя</div>
			<div className={styles.value}>{name}</div>
			<div className={styles.label}>Пол</div>
			<div className={styles.value}>{sex ? 'Ж' : 'М'}</div>
		</div>
	);
}

export default memo(Person);
