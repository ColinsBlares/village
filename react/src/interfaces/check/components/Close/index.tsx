import React, { memo } from 'react';
import styles from './index.module.css';
import { hideCheck } from '../../store';

function Close() {
	return (
		<div className={styles.close} onClick={hideCheck}>
			X
		</div>
	);
}

export default memo(Close);
