import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';

function Rank() {
	const type = useGovernmentBadgeStore(state => state.type);
	const rank = useGovernmentBadgeStore(state => state.rank);

	if (type !== 'fib') {
		return null;
	}

	return <div className={styles.rank}>{rank}</div>;
}

export default memo(Rank);
