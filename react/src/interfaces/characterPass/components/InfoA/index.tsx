import React, { memo } from 'react';
import styles from './index.module.css';
import { useCharacterPassStore } from '../../store';

function prettySpouse(sex: number | string | boolean, spouse: string | null) {
	if (!spouse) {
		return sex ? 'Не замужем' : 'Не женат';
	}
	const prefix = sex ? 'Замужем за ' : 'Женат на ';
	return prefix + spouse;
}

function InfoA() {
	const fName = useCharacterPassStore(state => state.fName);
	const sName = useCharacterPassStore(state => state.sName);
	const spouse = useCharacterPassStore(state => state.spouse);
	const sex = useCharacterPassStore(state => state.sex);
	const regDate = useCharacterPassStore(state => state.regDate);

	return (
		<div className={styles.infoA}>
			<div className={styles.label}>Имя</div>
			<div className={styles.value}>
				{fName} {sName}
			</div>
			<div className={styles.label}>Гражданство</div>
			<div className={styles.value}>UNITED STATES OF AMERICA</div>
			<div className={styles.label}>Семейное положение</div>
			<div className={styles.value}>{prettySpouse(sex, spouse)}</div>
			<div className={styles.label}>Дата получения</div>
			<div className={styles.value}>{regDate}</div>
		</div>
	);
}

export default memo(InfoA);
