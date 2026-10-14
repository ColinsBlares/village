import React, { memo } from 'react';
import styles from './index.module.css';
import { useMedicalCardStore } from '../../store';

function Sign() {
	const sign = useMedicalCardStore(state => state.sign);

	return <div className={styles.sign}>{sign}</div>;
}

export default memo(Sign);
