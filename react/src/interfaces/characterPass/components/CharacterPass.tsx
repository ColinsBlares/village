import React, { memo } from 'react';
import styles from './CharacterPass.module.css';
import bg from '@imgs/characterPass/bg.png';
import Close from './Close';
import Header from './Header';
import InfoA from './InfoA';
import InfoB from './InfoB';
import NumberView from './Number';
import Footer from './Footer';

function CharacterPass() {
	return (
		<div className={styles.root} style={{ backgroundImage: 'url(' + bg + ')' }}>
			<Close />
			<Header />
			<div className={styles.content}>
				<InfoA />
				<InfoB />
			</div>
			<NumberView />
			<Footer />
		</div>
	);
}

export default memo(CharacterPass);
