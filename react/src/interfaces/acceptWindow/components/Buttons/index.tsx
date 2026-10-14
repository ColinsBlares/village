import React from 'react';
import styles from './index.module.css';
import { acceptOfferWindow, declineOfferWindow } from '../../store';

function Buttons() {
	return (
		<div className={styles.btns}>
			<div className={styles.agree} onClick={acceptOfferWindow}>
				Подтвердить
			</div>
			<div className={styles.cancel} onClick={declineOfferWindow}>
				Отменить
			</div>
		</div>
	);
}

export default React.memo(Buttons);
