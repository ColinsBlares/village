import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

function Lock() {
	const lock = useSpeedometerStore(state => state.lock);
	const stateClass = lock == 0 ? styles.open : styles.closed;

	return (
		<div className={styles.row}>
			<div className={`${styles.icon} ${stateClass}`} aria-hidden="true">
				<div className={styles.shackle} />
				<div className={styles.body}>
					<div className={styles.hole} />
				</div>
			</div>
			<span>L</span>
		</div>
	);
}

export default memo(Lock);
