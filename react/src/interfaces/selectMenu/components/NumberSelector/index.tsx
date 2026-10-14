import React, { memo } from 'react';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';
import { currentItem, leftNumberType } from '../../view';

function NumberSelector() {
	const minLabel = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		return item && item.min != null ? String(item.min) : '';
	});
	const maxLabel = useSelectMenuStore(state => {
		const item = currentItem(state.menu);
		return item && item.max != null ? String(item.max) : '';
	});
	const left = useSelectMenuStore(state => {
		if (!state.menu || !state.menu.items || !state.menu.items[state.menu.i]) return '0%';
		return leftNumberType(state.menu);
	});
	const loader = useSelectMenuStore(state => state.loader);
	const className = loader ? styles.selector + ' ' + styles.inactive : styles.selector;

	return (
		<div className={className}>
			<div className={styles.label}>{minLabel}</div>
			<div className={styles.progress}>
				<div className={styles.fill} style={{ left: left }} />
			</div>
			<div className={styles.label}>{maxLabel}</div>
		</div>
	);
}

export default memo(NumberSelector);
