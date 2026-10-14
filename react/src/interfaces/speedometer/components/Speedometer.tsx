import React, { memo } from 'react';
import styles from './Speedometer.module.css';
import { useSpeedometerStore } from '../store';
import Gauge from './Gauge';
import Speed from './Speed';
import Fuel from './Fuel';
import Headlights from './Headlights';
import Lock from './Lock';
import Danger from './Danger';

function Speedometer() {
	const isActive = useSpeedometerStore(state => state.isActive);
	const rootClass = isActive ? styles.speedometer : `${styles.speedometer} ${styles.noActive}`;

	return (
		<div className={rootClass}>
			<Gauge />
			<Fuel />
			<Speed />
			<div className={styles.side}>
				<Headlights />
				<Lock />
				<Danger />
			</div>
		</div>
	);
}

export default memo(Speedometer);
