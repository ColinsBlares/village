import React from 'react';
import styles from './SelectionWindow.module.css';
import Header from './Header';
import Description from './Description';
import Records from './Records';
import Footer from './Footer';

function SelectionWindow() {
	return (
		<div id="selection-window" className={styles.root}>
			<Header />
			<Description />
			<Records />
			<Footer />
		</div>
	);
}

export default React.memo(SelectionWindow);
