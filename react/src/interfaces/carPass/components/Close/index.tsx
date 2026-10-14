import React, { memo } from 'react';
import styles from './index.module.css';
import { closeCarPass } from '../../store';

function Close() {
	return (
		<span className={styles.close} onClick={closeCarPass}>
			x
		</span>
	);
}

export default memo(Close);
