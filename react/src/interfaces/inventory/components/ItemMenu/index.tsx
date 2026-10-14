import React, { memo } from 'react';
import { getItemsMenu } from '../../model';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

function ItemMenu() {
	const menu = useInventoryStore(function (store) {
		return store.itemMenu;
	});
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const itemsMenu = useInventoryStore(function (store) {
		return store.itemsMenu;
	});
	const searchMode = useInventoryStore(function (store) {
		return store.searchMode;
	});
	void itemsMenu;
	void searchMode;

	const item = menu.item;
	if (!item || dragItem) return null;
	const actions = getItemsMenu(item.itemId);
	if (!actions) return null;
	const keys = Object.keys(actions);

	return (
		<div className={styles.menu} style={{ left: menu.x + 'px', top: menu.y + 'px' }}>
			{keys.map(function (key) {
				const value = actions[key];
				return (
					<div
						key={key}
						className={styles.item}
						onClick={function () {
							if (value && value.handler) value.handler(item);
						}}
					>
						{key}
						{value && value.items ? <div className={styles.arrow}>&gt;</div> : null}
					</div>
				);
			})}
		</div>
	);
}

export default memo(ItemMenu);
