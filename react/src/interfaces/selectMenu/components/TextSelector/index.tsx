import React, { memo } from 'react';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';
import { currentItem, selectorValues } from '../../view';

function TextSelector() {
	const visible = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		return !!(item && item.values && item.values.length > 1);
	});
	const packed = useSelectMenuStore(state => {
		const values = selectorValues(state.menu);
		if (!values) return '\n\n';
		const mid = values[1] == null ? '' : String(values[1]);
		return String(values[0]) + '\n' + mid + '\n' + String(values[2]);
	});
	const loader = useSelectMenuStore(state => state.loader);

	if (!visible) return null;

	const parts = packed.split('\n');
	const className = loader ? styles.selector + ' ' + styles.inactive : styles.selector;

	return (
		<div className={className}>
			<div className={styles.cell}>{parts[0]}</div>
			<div className={styles.cell + ' ' + styles.current}>{parts[1]}</div>
			<div className={styles.cell}>{parts[2]}</div>
		</div>
	);
}

export default memo(TextSelector);
