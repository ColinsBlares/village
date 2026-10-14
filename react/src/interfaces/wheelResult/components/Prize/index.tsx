import React, { memo } from 'react';
import styles from './index.module.css';
import { useWheelResultStore } from '../../store';

function Prize() {
	const prizeText = useWheelResultStore(state => state.prizeText);

	return <div className={styles.prize}>{prizeText}</div>;
}

export default memo(Prize);
