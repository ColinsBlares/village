import React, { memo } from 'react';
import styles from './index.module.css';
import Item from '../Item';
import { useSelectMenuStore } from '../../store';

function Items() {
	const signature = useSelectMenuStore(state => {
		if (!state.menu || !state.menu.items) return '';
		const start = state.menu.j || 0;
		const end = Math.min(state.menu.items.length, start + state.maxItems);
		let key = '';
		for (let index = start; index < end; index++) key += index + ',';
		return key;
	});

	const indexes: number[] = [];
	if (signature) {
		const parts = signature.split(',');
		for (let i = 0; i < parts.length; i++) {
			if (parts[i] === '') continue;
			indexes.push(Number(parts[i]));
		}
	}

	return (
		<div className={styles.items}>
			{indexes.map(index => (
				<Item key={index} index={index} />
			))}
		</div>
	);
}

export default memo(Items);
