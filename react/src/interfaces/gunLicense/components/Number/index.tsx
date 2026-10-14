import React, { memo } from 'react';
import styles from './index.module.css';
import { useGunLicenseStore } from '../../store';

function NumberView() {
	const number = useGunLicenseStore(state => state.number);

	return <div className={styles.number}>№ {number}</div>;
}

export default memo(NumberView);
