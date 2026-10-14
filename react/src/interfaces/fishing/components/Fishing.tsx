import React, { memo } from 'react';
import styles from './Fishing.module.css';
import Line from './Line';
import Wait from './Wait';
import Help from './Help';

function Fishing() {
	return (
		<div className={styles.root}>
			<Line />
			<Wait />
			<Help />
		</div>
	);
}

export default memo(Fishing);
