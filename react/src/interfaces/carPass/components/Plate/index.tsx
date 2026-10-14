import React, { memo } from 'react';
import styles from './index.module.css';
import { useCarPassStore } from '../../store';

function Plate() {
	const number = useCarPassStore(state => state.number);

	return <div className={styles.number}>{number}</div>;
}

export default memo(Plate);
