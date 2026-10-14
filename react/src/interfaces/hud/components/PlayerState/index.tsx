import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';
import coldImg from '@imgs/hud/cold.svg';
import heatImg from '@imgs/hud/heat.svg';

function PlayerState() {
	const cold = useHudStore(state => state.cold);
	const heat = useHudStore(state => state.heat);

	return (
		<div className={styles.playerState}>
			{cold && <img src={coldImg} alt="" />}
			{heat && <img src={heatImg} alt="" />}
		</div>
	);
}

export default memo(PlayerState);
