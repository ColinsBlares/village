import React, { memo } from 'react';
import styles from './index.module.css';
import { useCharacterPassStore } from '../../store';

function InfoB() {
	const sex = useCharacterPassStore(state => state.sex);

	return (
		<div className={styles.infoB}>
			<div className={styles.label}>Пол</div>
			<div className={styles.value}>{sex ? 'Ж' : 'М'}</div>
			<div className={styles.label}>Выдан</div>
			<div className={styles.value}>United States Department of State</div>
		</div>
	);
}

export default memo(InfoB);
