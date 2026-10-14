import React from 'react';
import styles from './Loader.module.css';
import Spinner from './Spinner';

function Loader() {
	return (
		<div id="loader" className={styles.root}>
			<Spinner />
		</div>
	);
}

export default React.memo(Loader);
