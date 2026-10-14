import React, { memo } from 'react';
import styles from './index.module.css';
import { closeDriverLicense } from '../../store';

function Close() {
	return (
		<span className={styles.close} onClick={closeDriverLicense}>
			x
		</span>
	);
}

export default memo(Close);
