import React from 'react';
import styles from './Watermark.module.css';
import Bars from './Bars';

function Watermark() {
	return (
		<div id="watermark" className={styles.root}>
			<Bars />
		</div>
	);
}

export default React.memo(Watermark);
