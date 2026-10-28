import React from 'react';
import styles from './index.module.css';
import { acceptOffer, useOfferDialogStore } from '../../store';

function Agree() {
	const green = useOfferDialogStore(state => state.green);
	const className = green ? styles.btn + ' ' + styles.pressed : styles.btn;

	return (
		<div className={className} onClick={acceptOffer}>
			Принять [Y]
		</div>
	);
}

export default React.memo(Agree);
