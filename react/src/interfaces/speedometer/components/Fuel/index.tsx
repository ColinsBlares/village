import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

function Pump() {
	return (
		<div className={styles.pump} aria-hidden="true">
			<div className={styles.pumpBody} />
			<div className={styles.pumpNeck} />
			<div className={styles.pumpHose} />
			<div className={styles.pumpNozzle} />
		</div>
	);
}

function Bolt() {
	return <div className={styles.bolt} aria-hidden="true" />;
}

function Fuel() {
	const fuel = useSpeedometerStore(state => state.fuel);
	const maxFuel = useSpeedometerStore(state => state.maxFuel);
	const isElectricCar = useSpeedometerStore(state => state.isElectricCar);
	const percent = maxFuel > 0 ? Math.round((fuel * 100) / maxFuel) : 0;

	return (
		<div className={styles.fuel}>
			{isElectricCar ? <Bolt /> : <Pump />}
			<span>{percent}%</span>
		</div>
	);
}

export default memo(Fuel);
