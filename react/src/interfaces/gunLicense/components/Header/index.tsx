import React, { memo } from 'react';
import styles from './index.module.css';
import { useGunLicenseStore } from '../../store';

function Header() {
	const header = useGunLicenseStore(state => state.header);

	return <div className={styles.header}>{header}</div>;
}

export default memo(Header);
