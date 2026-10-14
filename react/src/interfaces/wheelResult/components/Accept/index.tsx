import React, { memo } from 'react';
import styles from './index.module.css';
import { acceptWheelPrize } from '../../store';

function Accept() {
	return (
		<div className={styles.button} onClick={acceptWheelPrize}>
			Забрать
		</div>
	);
}

export default memo(Accept);
