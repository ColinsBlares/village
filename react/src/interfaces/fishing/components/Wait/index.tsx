import React, { memo } from 'react';
import styles from './index.module.css';
import { useFishingStore } from '../../store';

interface WaitProps {
	isInZone: boolean;
}

function Wait({ isInZone }: WaitProps) {
	const isStarted = useFishingStore(state => state.isStarted);
	const isFetch = useFishingStore(state => state.isFetch);

	const message = !isStarted
		? 'Забросьте удочку, чтобы начать рыбалку.'
		: isFetch
			? isInZone
				? 'Есть! Нажмите Space, чтобы подсечь.'
				: 'Следите за поплавком и нажмите Space в светлой зоне.'
			: 'Поплавок на воде — ждём поклёвку.';

	return (
		<div className={styles.wait}>
			<span className={styles.indicator} />
			<p>{message}</p>
		</div>
	);
}

export default memo(Wait);
