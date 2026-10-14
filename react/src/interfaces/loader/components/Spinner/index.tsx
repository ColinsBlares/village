import React from 'react';
import styles from './index.module.css';

function Spinner() {
	return (
		<div className={styles.rolling}>
			<div />
		</div>
	);
}

export default React.memo(Spinner);
