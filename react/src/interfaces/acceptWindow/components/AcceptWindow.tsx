import React from 'react';
import styles from './AcceptWindow.module.css';
import Head from './Head';
import Content from './Content';
import Buttons from './Buttons';

function AcceptWindow() {
	return (
		<div id="accept-window" className={styles.root}>
			<div className={styles.inner}>
				<Head />
				<Content />
				<Buttons />
			</div>
		</div>
	);
}

export default React.memo(AcceptWindow);
