import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

function Headlights() {
	const headlights = useSpeedometerStore(state => state.headlights);
	let stateClass = styles.off;

	if (headlights == 3) {
		stateClass = styles.high;
	} else if (headlights == 1 || headlights == 2) {
		stateClass = styles.on;
	}

	return (
		<div className={styles.row}>
			<div className={`${styles.icon} ${stateClass}`} aria-hidden="true">
				<div className={styles.body}>
					<div className={styles.core} />
				</div>
				<div className={styles.beam} />
				<div className={styles.beamShort} />
			</div>
			<span>B</span>
		</div>
	);
}

export default memo(Headlights);
