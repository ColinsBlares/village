import React, { memo } from 'react';
import styles from './index.module.css';
import { accentName, headerText, useWheelResultStore } from '../../store';

function Header() {
	const prizeType = useWheelResultStore(state => state.prizeType);

	const accentClass = styles[accentName(prizeType)] || '';
	const className = accentClass ? styles.header + ' ' + accentClass : styles.header;

	return <div className={className}>{headerText(prizeType)}</div>;
}

export default memo(Header);
