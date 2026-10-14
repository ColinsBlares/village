import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

function Danger() {
	const danger = useSpeedometerStore(state => state.danger);

	return (
		<div className={styles.row}>
			<div
				className={danger ? `${styles.icon} ${styles.on}` : styles.icon}
				aria-hidden="true"
			>
				<div className={styles.cap} />
				<div className={styles.block} />
			</div>
			<span>X</span>
		</div>
	);
}

export default memo(Danger);
