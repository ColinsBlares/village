import React, { memo } from 'react';
import styles from './index.module.css';
import { useCarPassStore } from '../../store';

function InfoB() {
	const owners = useCarPassStore(state => state.owners);
	const number = useCarPassStore(state => state.number);

	return (
		<div className={styles.infoB}>
			<div className={styles.label}>Владельцев</div>
			<div className={styles.value}>{owners}</div>
			<div className={styles.label}>Рег. номер</div>
			<div className={styles.value}>{number}</div>
		</div>
	);
}

export default memo(InfoB);
