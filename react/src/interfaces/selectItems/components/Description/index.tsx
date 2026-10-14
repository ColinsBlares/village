import React from 'react';
import styles from './index.module.css';
import { useSelectItemsStore } from '../../store';

function focusedItem(tempFocus: number) {
	const inventory = (window as any).inventory;
	if (!inventory) {
		return null;
	}
	if (tempFocus != -1) {
		return inventory.hotkeys[tempFocus];
	}
	return inventory.equipment[13];
}

function Description() {
	const tempFocus = useSelectItemsStore(state => state.tempFocus);
	const revision = useSelectItemsStore(state => state.revision);
	void revision;

	const inventory = (window as any).inventory;
	const item = focusedItem(tempFocus);
	if (!inventory || !item || !inventory.getItem || !inventory.getItem(item.sqlId)) {
		return null;
	}

	const name = inventory.getItemName(item);
	if (!name) {
		return null;
	}

	let count: string | null = null;
	if (item.params) {
		if (item.params.weaponHash) {
			count = item.params.ammo != null ? item.params.ammo + ' патронов' : null;
		} else {
			count = item.params.count ? item.params.count + ' ед.' : null;
		}
	}

	return (
		<div className={styles.description}>
			<div>{name}</div>
			<div className={styles.amount}>{count}</div>
		</div>
	);
}

export default React.memo(Description);
