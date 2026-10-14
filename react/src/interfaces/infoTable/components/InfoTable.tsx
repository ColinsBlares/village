import React from 'react';
import styles from './InfoTable.module.css';
import Header from './Header';
import Rows from './Rows';

function InfoTable() {
	return (
		<div id="infoTable" className={styles.root}>
			<Header />
			<Rows />
		</div>
	);
}

export default React.memo(InfoTable);
