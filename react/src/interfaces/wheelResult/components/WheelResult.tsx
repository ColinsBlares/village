import React, { memo } from 'react';
import styles from './WheelResult.module.css';
import { accentName, useWheelResultStore } from '../store';
import Header from './Header';
import Icon from './Icon';
import Prize from './Prize';
import Accept from './Accept';

function WheelResult() {
	const prizeType = useWheelResultStore(state => state.prizeType);
	const accentClass = styles[accentName(prizeType)] || '';
	const rootClass = accentClass ? styles.root + ' ' + accentClass : styles.root;

	return (
		<div className={rootClass}>
			<Header />
			<Icon />
			<Prize />
			<Accept />
		</div>
	);
}

export default memo(WheelResult);
