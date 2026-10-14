import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';

function Sign() {
	const sign = useGovernmentBadgeStore(state => state.sign);

	return <div className={styles.sign}>{sign}</div>;
}

export default memo(Sign);
