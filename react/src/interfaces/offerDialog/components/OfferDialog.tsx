import React from 'react';
import styles from './OfferDialog.module.css';
import Agree from './Agree';
import Message from './Message';
import Cancel from './Cancel';

function OfferDialog() {
	return (
		<div id="offerDialog">
			<div className={styles.quick}>
				<Agree />
				<Message />
				<Cancel />
			</div>
		</div>
	);
}

export default React.memo(OfferDialog);
