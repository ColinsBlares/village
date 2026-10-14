import React, { memo, useEffect, useRef } from 'react';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';
import { isEditing } from '../../view';

function TextField() {
	const inputRef = useRef<HTMLInputElement>(null);
	const editing = useSelectMenuStore(state => isEditing(state.show, state.menu));
	const placeholder = useSelectMenuStore(state => {
		if (!state.menu || !state.menu.items || !state.menu.items[state.menu.i]) return '';
		const text = state.menu.items[state.menu.i].text;
		return text == null ? '' : String(text);
	});
	const value = useSelectMenuStore(state => {
		if (!state.menu || !state.menu.items || !state.menu.items[state.menu.i]) return '';
		const item = state.menu.items[state.menu.i];
		if (!item.values) return '';
		const current = item.values[0];
		return current == null ? '' : String(current);
	});
	const focusTick = useSelectMenuStore(state => state.focusTick);
	const seenTick = useRef(focusTick);

	useEffect(
		function () {
			if (seenTick.current === focusTick) return;
			seenTick.current = focusTick;
			if (!editing || !inputRef.current) return;
			inputRef.current.focus();
		},
		[focusTick, editing],
	);

	if (!editing) return null;

	return (
		<div className={styles.textField}>
			<input
				ref={inputRef}
				className={styles.input}
				type="text"
				value={value}
				placeholder={placeholder}
				onChange={function (event) {
					const menu = useSelectMenuStore.getState().menu;
					if (!menu || !menu.items) return;
					const item = menu.items[menu.i];
					if (!item || !item.values) return;
					item.values[0] = event.target.value;
				}}
			/>
		</div>
	);
}

export default memo(TextField);
