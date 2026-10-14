import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

function Speed() {
	const speed = useSpeedometerStore(state => state.speed);

	return (
		<div className={styles.speed}>
			<div className={styles.value}>{Math.round(speed)}</div>
			<div className={styles.unit}>km/h</div>
		</div>
	);
}

export default memo(Speed);
