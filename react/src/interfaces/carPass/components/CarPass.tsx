import React, { memo } from 'react';
import styles from './CarPass.module.css';
import bg from '@imgs/carPass/bg.png';
import Close from './Close';
import Header from './Header';
import InfoA from './InfoA';
import InfoB from './InfoB';
import Plate from './Plate';

function CarPass() {
	return (
		<div className={styles.root} style={{ backgroundImage: 'url(' + bg + ')' }}>
			<Close />
			<Header />
			<div className={styles.content}>
				<InfoA />
				<InfoB />
			</div>
			<Plate />
		</div>
	);
}

export default memo(CarPass);
