import React, { memo } from 'react';
import styles from './CaptureScore.module.css';
import Teams from './Teams';
import Progress from './Progress';
import Score from './Score';

function CaptureScore() {
	return (
		<div className={styles.root}>
			<div className={styles.header}>
				<Teams />
				<Progress />
				<Score />
			</div>
		</div>
	);
}

export default memo(CaptureScore);
