import React from 'react';
import styles from './index.module.css';
import { acceptSelection, declineSelection } from '../../store';

function Footer() {
	return (
		<div className={styles.footer}>
			<div className={styles.left} onClick={acceptSelection}>
				Принять
			</div>
			<div className={styles.right} onClick={declineSelection}>
				Отменить
			</div>
		</div>
	);
}

export default React.memo(Footer);
