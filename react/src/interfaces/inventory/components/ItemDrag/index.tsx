import React, { memo } from 'react';
import { itemStyle } from '../../model';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

function ItemDrag() {
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const dragX = useInventoryStore(function (store) {
		return store.dragX;
	});
	const dragY = useInventoryStore(function (store) {
		return store.dragY;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	void itemsInfo;

	if (!dragItem) return null;

	return (
		<div className={styles.drag} style={{ left: dragX + 'px', top: dragY + 'px' }}>
			<div className={styles.item + ' inv-item'} style={itemStyle(dragItem)} />
		</div>
	);
}

export default memo(ItemDrag);
