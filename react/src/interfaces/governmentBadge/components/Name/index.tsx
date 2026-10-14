import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';

function Name() {
	const name = useGovernmentBadgeStore(state => state.name);
	const type = useGovernmentBadgeStore(state => state.type);
	const className = type === 'fib' ? styles.name + ' ' + styles.fib : styles.name;

	return <div className={className}>{name}</div>;
}

export default memo(Name);
