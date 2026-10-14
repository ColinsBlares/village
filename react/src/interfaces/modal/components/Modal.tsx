import React from 'react';
import styles from './Modal.module.css';
import Close from './Close';
import Header from './Header';
import Content from './Content';

function Modal() {
	return (
		<div id="modal" className={styles.root}>
			<Close />
			<Header />
			<Content />
		</div>
	);
}

export default React.memo(Modal);
