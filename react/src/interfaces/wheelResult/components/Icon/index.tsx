import React, { memo } from 'react';
import styles from './index.module.css';
import { accentName, prizeIcon, useWheelResultStore } from '../../store';

function Icon() {
	const prizeType = useWheelResultStore(state => state.prizeType);

	const accentClass = styles[accentName(prizeType)] || '';
	const className = accentClass ? styles.icon + ' ' + accentClass : styles.icon;

	return <div className={className}>{prizeIcon(prizeType)}</div>;
}

export default memo(Icon);
