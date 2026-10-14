import React from 'react';
import styles from './index.module.css';
import { useTimerStore } from '../../store';

function TimeLeft() {
	const time = useTimerStore(state => state.time);

	return <div className={styles.time}>{time / 1000} с.</div>;
}

export default React.memo(TimeLeft);
