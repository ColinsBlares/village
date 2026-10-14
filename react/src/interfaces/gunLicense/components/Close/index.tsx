import React, { memo } from 'react';
import styles from './index.module.css';
import { closeGunLicense } from '../../store';

function Close() {
	return (
		<span className={styles.close} onClick={closeGunLicense}>
			x
		</span>
	);
}

export default memo(Close);
