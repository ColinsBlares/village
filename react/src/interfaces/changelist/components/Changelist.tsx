import React, { memo } from 'react';
import styles from './Changelist.module.css';
import Close from './Close';
import Header from './Header';
import Content from './Content';
import Footer from './Footer';

function Changelist() {
	return (
		<div className={styles.changelist}>
			<Close />
			<Header />
			<Content />
			<Footer />
		</div>
	);
}

export default memo(Changelist);
