import React, { memo } from 'react';
import styles from './index.module.css';
import fishImg from '@imgs/fishing/fish.png';
import { useFishingStore } from '../../store';

function Wait() {
	const isStarted = useFishingStore(state => state.isStarted);
	const isFetch = useFishingStore(state => state.isFetch);

	if (!isStarted || isFetch) return null;

	return (
		<div className={styles.wait}>
			<div>
				<img className={styles.fish} src={fishImg} alt="" />
			</div>
			Ждите, пока рыба клюнет...
		</div>
	);
}

export default memo(Wait);
