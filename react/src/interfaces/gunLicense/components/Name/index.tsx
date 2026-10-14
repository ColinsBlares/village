import React, { memo } from 'react';
import styles from './index.module.css';
import { useGunLicenseStore } from '../../store';

function Name() {
	const name = useGunLicenseStore(state => state.name);

	return <div className={styles.name}>{name}</div>;
}

export default memo(Name);
