import React from 'react';
import styles from './index.module.css';
import { useTimerStore } from '../../store';

function Caption() {
	const text = useTimerStore(state => (state.timer ? state.timer.text : ''));

	return <div className={styles.text}>{text}</div>;
}

export default React.memo(Caption);
