import React from 'react';
import styles from './OfferDialog.module.css';
import Actions from './Actions';
import Message from './Message';
import Progress from './Progress';
import Title from './Title';

function OfferDialog() {
	return (
		<div id="offerDialog" className={styles.card}>
			<Progress />
			<Title />
			<Message />
			<Actions />
		</div>
	);
}

export default React.memo(OfferDialog);
