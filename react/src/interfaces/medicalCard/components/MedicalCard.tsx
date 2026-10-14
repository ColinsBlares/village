import React, { memo } from 'react';
import styles from './MedicalCard.module.css';
import bg from '@imgs/medicalCard/bg.svg';
import Cancel from './Cancel';
import Info from './Info';
import Identifier from './Identifier';
import Sign from './Sign';

function MedicalCard() {
	return (
		<div className={styles.root} style={{ backgroundImage: 'url(' + bg + ')' }}>
			<Cancel />
			<Info />
			<Identifier />
			<Sign />
		</div>
	);
}

export default memo(MedicalCard);
