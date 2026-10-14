import React, { memo } from 'react';
import styles from './index.module.css';
import Arrow from '../Arrow';
import Items from '../Items';
import { useSelectMenuStore } from '../../store';

const ArrowUp = memo(function ArrowUp() {
	const active = useSelectMenuStore(state => !!(state.menu && state.menu.j > 0));
	return <Arrow direction="up" active={active} />;
});

const ArrowDown = memo(function ArrowDown() {
	const active = useSelectMenuStore(state => {
		if (!state.menu || !state.menu.items) return false;
		return state.menu.j < state.menu.items.length - state.maxItems;
	});
	return <Arrow direction="down" active={active} />;
});

function Content() {
	const loader = useSelectMenuStore(state => state.loader);
	const className = loader ? styles.content + ' ' + styles.inactive : styles.content;

	return (
		<div className={className}>
			<ArrowUp />
			<Items />
			<ArrowDown />
		</div>
	);
}

export default memo(Content);
