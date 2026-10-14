import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';
import burgerImg from '@imgs/hud/burger.svg';
import glassImg from '@imgs/hud/glass.svg';
import RadialProgress from '@/components/RadialProgress';

function Starvation() {
	const satiety = useHudStore(state => state.satiety);
	const thirst = useHudStore(state => state.thirst);
	/* 	const satietyClass = satiety <= 10 ? styles.red : '';
	const thirstClass = thirst <= 10 ? styles.red : ''; */

	return (
		<div className={styles.starvation__container}>
			<RadialProgress
				glow={false}
				value={satiety}
				max={100}
				size='11.111vh'
				clockwise={false}
				radius={25}
				strokeWidth={3}
				cap='butt'
				color={['#FF6711', '#FF8311']}
				trackColor={'rgba(181 181 181 / 0.5)'}
			>
				<img src={burgerImg} alt='burger' className={styles.starvation__icon} />
			</RadialProgress>
			<RadialProgress
				glow={false}
				value={thirst}
				max={100}
				size='11.111vh'
				clockwise={false}
				radius={25}
				strokeWidth={3}
				cap='butt'
				color={['#1FB9FF', '#1FFFE4']}
				trackColor={'rgba(181 181 181 / 0.5)'}
			>
				<img src={glassImg} alt='water' className={styles.starvation__icon} />
			</RadialProgress>
		</div>
	);
}

export default memo(Starvation);
