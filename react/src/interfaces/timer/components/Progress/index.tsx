import React from 'react';
import styles from './index.module.css';
import { useTimerStore } from '../../store';

function Progress() {
	const time = useTimerStore(state => state.time);
	const allTime = useTimerStore(state => state.allTime);
	const width = allTime ? (time / allTime) * 100 : 0;

	return (
		<div className={styles.progress}>
			<div className={styles.fill} style={{ width: width + '%' }} />
		</div>
	);
}

export default React.memo(Progress);
