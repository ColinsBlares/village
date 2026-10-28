import React from 'react';
import styles from './index.module.css';
import Agree from '../Agree';
import Cancel from '../Cancel';

function Actions() {
	return (
		<div className={styles.row}>
			<Agree />
			<Cancel />
		</div>
	);
}

export default React.memo(Actions);
