import React from 'react';
import styles from './index.module.css';
import { declineOffer, useOfferDialogStore } from '../../store';

function Cancel() {
	const red = useOfferDialogStore(state => state.red);
	const className = red ? styles.btn + ' ' + styles.pressed : styles.btn;

	return (
		<div className={className} onClick={declineOffer}>
			Отклонить [N]
		</div>
	);
}

export default React.memo(Cancel);
