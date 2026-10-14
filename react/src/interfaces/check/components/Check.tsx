import React, { memo } from 'react';
import styles from './Check.module.css';
import bg from '@imgs/check/bg.png';
import Close from './Close';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';

function Check() {
	return (
		<div className={styles.root} style={{ backgroundImage: 'url(' + bg + ')' }}>
			<Close />
			<div className={styles.content}>
				<Header />
				<Body />
				<Footer />
			</div>
		</div>
	);
}

export default memo(Check);
