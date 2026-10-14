import React, { memo } from 'react';
import styles from './index.module.css';
import { useDriverLicenseStore } from '../../store';

function Header() {
	const header = useDriverLicenseStore(state => state.header);

	return <div className={styles.header}>{header}</div>;
}

export default memo(Header);
