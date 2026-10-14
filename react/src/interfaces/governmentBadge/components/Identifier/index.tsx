import React, { memo } from 'react';
import styles from './index.module.css';
import { useGovernmentBadgeStore } from '../../store';

function Identifier() {
	const identifier = useGovernmentBadgeStore(state => state.identifier);
	const type = useGovernmentBadgeStore(state => state.type);
	const className = type === 'fib' ? styles.identifier + ' ' + styles.fib : styles.identifier;

	return <div className={className}>{identifier}</div>;
}

export default memo(Identifier);
