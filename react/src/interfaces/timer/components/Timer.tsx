import React from 'react';
import styles from './Timer.module.css';
import Icon from './Icon';
import Caption from './Caption';
import Progress from './Progress';
import TimeLeft from './TimeLeft';

function Timer() {
	return (
		<div id="timer" className={styles.root}>
			<Icon />
			<Caption />
			<Progress />
			<TimeLeft />
		</div>
	);
}

export default React.memo(Timer);
