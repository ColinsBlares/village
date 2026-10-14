import React from 'react';
import styles from './index.module.css';
import { useTimerStore } from '../../store';
import deathIcon from '@imgs/timer/death.svg';

const ICONS: Record<string, string> = {
	'death.svg': deathIcon,
};

function Icon() {
	const icon = useTimerStore(state => (state.timer ? state.timer.icon : ''));
	const src = ICONS[icon] || '';

	return <img className={styles.icon} src={src} alt="" />;
}

export default React.memo(Icon);
