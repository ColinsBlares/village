import React, { memo } from 'react';
import styles from './index.module.css';
import { CAPTURE_COLORS, captureProgress, useCaptureScoreStore } from '../../store';

function Progress() {
	const leftBandId = useCaptureScoreStore(state => state.leftBandId);
	const rightBandId = useCaptureScoreStore(state => state.rightBandId);
	const leftScore = useCaptureScoreStore(state => state.leftScore);
	const rightScore = useCaptureScoreStore(state => state.rightScore);

	return (
		<div className={styles.progress} style={{ background: CAPTURE_COLORS[rightBandId] }}>
			<div
				className={styles.fill}
				style={{
					width: captureProgress(leftScore, rightScore) + '%',
					background: CAPTURE_COLORS[leftBandId],
				}}
			/>
		</div>
	);
}

export default memo(Progress);
