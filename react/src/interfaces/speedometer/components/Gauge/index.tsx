import React, { memo } from 'react';
import RadialProgress from '@/components/RadialProgress';
import { useSpeedometerStore } from '../../store';
import styles from './index.module.css';

function Gauge() {
	const speed = useSpeedometerStore(state => state.speed);
	const maxSpeed = useSpeedometerStore(state => state.maxSpeed);
	const fuel = useSpeedometerStore(state => state.fuel);
	const maxFuel = useSpeedometerStore(state => state.maxFuel);

	return (
		<RadialProgress
			className={styles.gauge}
			size='19.72vh'
			animate={false}
			arcs={[
				{
					value: speed,
					max: maxSpeed || 1,
					startAngle: 170.7,
					sweep: 225,
					radius: 39.2,
					strokeWidth: 2.63,
					cap: 'butt',
					color: '#ffffff',
					trackColor: 'rgba(255, 255, 255, 0.3)',
					glow: 2.2,
					trackWidth: 5.63,
				},
				{
					value: fuel,
					max: maxFuel || 1,
					startAngle: 211.3,
					sweep: 103.7,
					radius: 49.06,
					strokeWidth: 1.88,
					cap: 'square',
					color: '#ffffff',
					trackColor: 'rgba(255, 255, 255, 0.3)',
					glow: 1.4,
				},
			]}
		/>
	);
}

export default memo(Gauge);
