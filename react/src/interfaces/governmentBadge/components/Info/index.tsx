import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';

function Info() {
	const type = useGovernmentBadgeStore(state => state.type);
	const rank = useGovernmentBadgeStore(state => state.rank);
	const gender = useGovernmentBadgeStore(state => state.gender);

	if (type === 'fib') {
		return null;
	}

	return (
		<div className={styles.info}>
			<div>
				<span>Звание: </span>
				{rank}
			</div>
			<div>
				<span>Пол: </span>
				{gender}
			</div>
		</div>
	);
}

export default memo(Info);
