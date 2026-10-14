import React, { memo } from 'react';
import edit from '@imgs/selectMenu/edit.png';
import editSelected from '@imgs/selectMenu/edit-selected.png';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';
import { itemLabel, itemValuesType } from '../../view';

interface ItemProps {
	index: number;
}

function menuItem(state: { menu: any }, index: number) {
	if (!state.menu || !state.menu.items) return null;
	return state.menu.items[index] || null;
}

function Item(props: ItemProps) {
	const index = props.index;
	const text = useSelectMenuStore(state => itemLabel(menuItem(state, index) && menuItem(state, index).text));
	const location = useSelectMenuStore(state => {
		const item = menuItem(state, index);
		return item && item.location ? item.location : '';
	});
	const selectedState = useSelectMenuStore(state => {
		if (!state.menu || state.menu.i !== index) return 0;
		return state.loader ? 2 : 1;
	});
	const kind = useSelectMenuStore(state => itemValuesType(state.menu, index));
	const hasValues = useSelectMenuStore(state => {
		const item = menuItem(state, index);
		return !!(item && item.values);
	});
	const valueText = useSelectMenuStore(state => {
		const item = menuItem(state, index);
		if (!item || !item.values) return '';
		const current = item.values[item.i];
		if (current == null) return '';
		return String(current);
	});
	const color = useSelectMenuStore(state => {
		const item = menuItem(state, index);
		if (!item || !item.values) return '';
		const current = item.values[item.i];
		return current == null ? '' : String(current);
	});

	let className = styles.item;
	if (selectedState === 1) className += ' ' + styles.selected;
	if (selectedState === 2) className += ' ' + styles.selected + ' ' + styles.selectedInactive;

	const nameClass = location ? styles.name + ' ' + styles.button : styles.name;
	const nameStyle: React.CSSProperties | undefined = location
		? { textAlign: location as React.CSSProperties['textAlign'] }
		: undefined;

	return (
		<div className={className}>
			<div className={nameClass} style={nameStyle}>
				{text}
			</div>
			{hasValues && kind !== 1 ? (
				<div className={styles.value}>
					{valueText}
					{kind === 3 ? <img src={selectedState ? editSelected : edit} alt="" /> : null}
				</div>
			) : null}
			{hasValues && kind === 1 ? <div className={styles.color} style={{ background: color }} /> : null}
		</div>
	);
}

export default memo(Item);
