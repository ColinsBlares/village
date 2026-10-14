import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';

function DirectorSign() {
	const type = useGovernmentBadgeStore(state => state.type);
	const directorSign = useGovernmentBadgeStore(state => state.directorSign);

	if (type !== 'fib') {
		return null;
	}

	return <div className={styles.directorSign}>{directorSign}</div>;
}

export default memo(DirectorSign);
