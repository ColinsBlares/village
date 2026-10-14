import React, { memo } from 'react';
import styles from './index.module.css';
import { useMedicalCardStore } from '../../store';

function Info() {
	const name = useMedicalCardStore(state => state.name);
	const gender = useMedicalCardStore(state => state.gender);
	const occupation = useMedicalCardStore(state => state.occupation);
	const time = useMedicalCardStore(state => state.time);

	return (
		<div className={styles.info}>
			<div className={styles.name}>{name}</div>
			<div>
				<span>Пол: </span>
				{gender}
			</div>
			<div>
				<span>Организация: </span>
				{occupation}
			</div>
			<div>
				<span>Истекает: </span>
				{time}
			</div>
		</div>
	);
}

export default memo(Info);
