import React, { memo } from 'react';
import styles from './DriverLicense.module.css';
import bg from '@imgs/driverLicense/bg.png';
import Close from './Close';
import Header from './Header';
import Person from './Person';
import Categories from './Categories';

function DriverLicense() {
	return (
		<div className={styles.root} style={{ backgroundImage: 'url(' + bg + ')' }}>
			<Close />
			<Header />
			<div className={styles.content}>
				<Person />
				<Categories />
			</div>
		</div>
	);
}

export default memo(DriverLicense);
