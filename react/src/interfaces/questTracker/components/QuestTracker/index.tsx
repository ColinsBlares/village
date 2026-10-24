import React, { memo } from 'react';
import styles from './index.module.css';
import { useQuestTrackerStore } from '../../store';

function QuestTrackerView() {
	const visible = useQuestTrackerStore(state => state.visible);
	const title = useQuestTrackerStore(state => state.title);
	const objective = useQuestTrackerStore(state => state.objective);
	const progress = useQuestTrackerStore(state => state.progress);

	if (!visible) {
		return null;
	}

	let progressText = '';
	if (progress && progress.target > 0) {
		progressText = `${Math.floor(progress.current)} / ${Math.floor(progress.target)}`;
	}

	return (
		<div className={styles.root}>
			<div className={styles.title}>{title}</div>
			<div className={styles.objective}>{objective}</div>
			{progressText ? (
				<div className={styles.progress}>{progressText}</div>
			) : null}
		</div>
	);
}

export default memo(QuestTrackerView);
