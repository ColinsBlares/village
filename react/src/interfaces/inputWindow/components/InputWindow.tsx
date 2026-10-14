import React from 'react';
import styles from './InputWindow.module.css';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';

function InputWindow() {
	return (
		<div id="input-window" className={styles.root}>
			<Header />
			<Body />
			<Footer />
		</div>
	);
}

export default React.memo(InputWindow);
