import React, { memo } from 'react';
import styles from './GunLicense.module.css';
import bg from '@imgs/gunLicense/bg.png';
import Close from './Close';
import Header from './Header';
import Name from './Name';
import Sex from './Sex';
import DateView from './Date';
import NumberView from './Number';

function GunLicense() {
	return (
		<div className={styles.root} style={{ backgroundImage: 'url(' + bg + ')' }}>
			<Close />
			<Header />
			<div className={styles.line} />
			<div className={styles.content}>
				<Name />
				<Sex />
				<DateView />
				<NumberView />
			</div>
		</div>
	);
}

export default memo(GunLicense);
