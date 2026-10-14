import React, { memo } from 'react';
import { cx } from '../../cx';
import { getItem, onHotkeyItemEnter, onHotkeyItemLeave, onItemMouseDown } from '../../model';
import { useInventoryStore } from '../../store';
import ItemView from '../ItemView';
import styles from './index.module.css';

function Hotkeys() {
	const version = useInventoryStore(function (store) {
		return store.hotkeysVersion;
	});
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	const hotkeyFocus = useInventoryStore(function (store) {
		return store.access.hotkeyFocus;
	});
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const hotkeysList = useInventoryStore(function (store) {
		return store.hotkeysList;
	});
	const searchMode = useInventoryStore(function (store) {
		return store.searchMode;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	const hotkeys = useInventoryStore.getState().hotkeys;
	void equipment;

	const keys = [];
	if (!searchMode) {
		for (let n = 1; n <= 9; n++) {
			const bound = hotkeys[n];
			const alive = !!(bound && getItem(bound.sqlId));
			const active = !!(dragItem && hotkeysList[dragItem.itemId] && !alive);
			const focus = !!(dragItem && hotkeyFocus == n);
			keys.push(
				<div
					key={n}
					className={cx(styles.key, focus && styles.focus, active && styles.active, alive && styles.has)}
					onMouseEnter={function () {
						onHotkeyItemEnter(n);
					}}
					onMouseLeave={function () {
						onHotkeyItemLeave();
					}}
				>
					{alive ? (
						<ItemView
							item={bound}
							mode="hotkey"
							debug={debug}
							dragging={!!(dragItem && dragItem.sqlId == bound.sqlId)}
							onMouseDown={function (e) {
								onItemMouseDown(bound, e);
							}}
						/>
					) : null}
					<span className={styles.hotkey}>{n}</span>
				</div>
			);
		}
	}

	return (
		<div className={styles.hotkeys} data-version={version}>
			{keys}
		</div>
	);
}

export default memo(Hotkeys);
