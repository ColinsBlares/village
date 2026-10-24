import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';

function QuestTrackerView() {
	const visible = useHudStore(state => state.questVisible);
	const label = useHudStore(state => state.questLabel);
	const title = useHudStore(state => state.questTitle);
	const objective = useHudStore(state => state.questObjective);
	const current = useHudStore(state => state.questProgressCurrent);
	const target = useHudStore(state => state.questProgressTarget);
	const unit = useHudStore(state => state.questProgressUnit);

	if (!visible) {
		return null;
	}

	const hasProgress = target > 0;
	const progressPct = hasProgress
		? Math.min(100, Math.max(0, (current / target) * 100))
		: 0;
	const headline = hasProgress ? label : label;
	const subtitle = objective;

	return (
		<div
			className={
				(hasProgress ? styles.card + ' ' + styles.cardProgress : styles.card) +
				' ' +
				styles.placement
			}
		>
			<div className={styles.label}>{headline}</div>
			<div className={styles.objective}>{subtitle}</div>
			{hasProgress ? (
				<>
					<span className={styles.progressCount}>
						( {Math.floor(current)} / {Math.floor(target)} )
					</span>
				</>
			) : null}
		</div>
	);
}

export default memo(QuestTrackerView);
