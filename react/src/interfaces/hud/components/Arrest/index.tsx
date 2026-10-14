import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';
import jailImg from '@imgs/hud/jail.svg';

function Arrest() {
	const arrestTime = useHudStore(state => state.arrestTime);
	const arrestTimeMax = useHudStore(state => state.arrestTimeMax);

	if (arrestTime <= 0) {
		return null;
	}

	const progress =
		arrestTimeMax > 0 ? 100 - (arrestTime / arrestTimeMax) * 100 : 0;
	const description = `До освобождения ${
		arrestTime > 60
			? `${Math.floor(arrestTime / 60)} мин.`
			: `${arrestTime} сек`
	}`;

	return (
		<div className={styles.arrest}>
			<div className={styles.wrap}>
				<svg>
					<circle
						style={{ strokeDasharray: `${progress * 1.57}% 157%` }}
					/>
				</svg>
				<img src={jailImg} alt="" />
			</div>
			<div className={styles.description}>{description}</div>
		</div>
	);
}

export default memo(Arrest);
