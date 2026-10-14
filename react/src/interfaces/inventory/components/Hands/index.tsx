import React, { memo } from 'react';
import handImg from '@imgs/inventory/hand.svg';
import { cx } from '../../cx';
import { itemGradient, onBodyItemEnter, onBodyItemLeave, onItemContextMenu, onItemMouseDown } from '../../model';
import { useInventoryStore } from '../../store';
import ItemView from '../ItemView';
import styles from './index.module.css';

function Hands() {
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	const handsBlock = useInventoryStore(function (store) {
		return store.handsBlock;
	});
	const bodyFocus = useInventoryStore(function (store) {
		return store.access.bodyFocus;
	});
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	const item = equipment[13];
	const gradient = itemGradient(item, true);
	const busy = !!(item && !item.search);
	const focus = !!(dragItem && bodyFocus == 13);

	return (
		<div className={cx(styles.hands, dragItem && styles.active, handsBlock && styles.blocked)}>
			<div
				className={cx(styles.slot, busy && styles.busy, focus && styles.focus)}
				style={gradient ? { backgroundImage: gradient } : undefined}
				onMouseEnter={function () {
					onBodyItemEnter(13);
				}}
				onMouseLeave={function () {
					onBodyItemLeave();
				}}
			>
				{item && !item.search ? (
					<ItemView
						item={item}
						mode="hands"
						debug={debug}
						dragging={!!(dragItem && dragItem.sqlId == item.sqlId)}
						onMouseDown={function (e) {
							onItemMouseDown(item, e);
						}}
						onContextMenu={function (e) {
							onItemContextMenu(item, e);
						}}
					/>
				) : null}
				{!item ? (
					<img src={handImg} alt="" />
				) : null}
				{!item ? (
					<img src={handImg} alt="" />
				) : null}
			</div>
		</div>
	);
}

export default memo(Hands);
