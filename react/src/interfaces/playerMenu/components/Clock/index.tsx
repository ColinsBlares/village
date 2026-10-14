import React, { memo } from 'react';
import styles from './index.module.css';
import { usePlayerMenuStore } from '../../store';

function Clock() {
	const time = usePlayerMenuStore(state => state.time);
	const date = usePlayerMenuStore(state => state.date);

	return (
		<div className={styles.date}>
			{time} <br /> {date}
		</div>
	);
}

export default memo(Clock);
