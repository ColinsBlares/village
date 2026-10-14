import React, { memo } from 'react';
import styles from './index.module.css';
import { formatCaptureTime, useCaptureScoreStore } from '../../store';

function Score() {
	const leftScore = useCaptureScoreStore(state => state.leftScore);
	const rightScore = useCaptureScoreStore(state => state.rightScore);
	const time = useCaptureScoreStore(state => state.time);

	return (
		<div className={styles.score}>
			<div>Убийств: {leftScore}</div>
			<div>{formatCaptureTime(time)}</div>
			<div>Убийств: {rightScore}</div>
		</div>
	);
}

export default memo(Score);
