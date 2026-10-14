import React, { memo } from 'react';
import item1 from '@imgs/inventory/items/1.png';
import item2 from '@imgs/inventory/items/2.png';
import item3 from '@imgs/inventory/items/3.png';
import item6 from '@imgs/inventory/items/6.png';
import item7 from '@imgs/inventory/items/7.png';
import item8 from '@imgs/inventory/items/8.png';
import item9 from '@imgs/inventory/items/9.png';
import item10 from '@imgs/inventory/items/10.png';
import item11 from '@imgs/inventory/items/11.png';
import item12 from '@imgs/inventory/items/12.png';
import item13 from '@imgs/inventory/items/13.png';
import item14 from '@imgs/inventory/items/14.png';
import item22 from '@imgs/inventory/items/22.png';
import { cx } from '../../cx';
import { itemGradient, onBodyItemEnter, onBodyItemLeave, onItemContextMenu, onItemMouseDown, onItemMouseEnter, onItemMouseLeave, onItemMouseMove } from '../../model';
import { useInventoryStore } from '../../store';
import ItemView from '../ItemView';
import Starvation from '../Starvation';
import styles from './index.module.css';

const slotStyle = {
	['--slot-1' as any]: 'url("' + item1 + '")',
	['--slot-2' as any]: 'url("' + item6 + '")',
	['--slot-3' as any]: 'url("' + item14 + '")',
	['--slot-4' as any]: 'url("' + item2 + '")',
	['--slot-5' as any]: 'url("' + item3 + '")',
	['--slot-6' as any]: 'url("' + item7 + '")',
	['--slot-7' as any]: 'url("' + item11 + '")',
	['--slot-8' as any]: 'url("' + item10 + '")',
	['--slot-9' as any]: 'url("' + item12 + '")',
	['--slot-10' as any]: 'url("' + item22 + '")',
	['--slot-11' as any]: 'url("' + item13 + '")',
	['--slot-12' as any]: 'url("' + item8 + '")',
	['--slot-13' as any]: 'url("' + item9 + '")',
};

function Equipment() {
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	const bodyList = useInventoryStore(function (store) {
		return store.bodyList;
	});
	const bodyFocus = useInventoryStore(function (store) {
		return store.access.bodyFocus;
	});
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const searchMode = useInventoryStore(function (store) {
		return store.searchMode;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	void itemsInfo;

	const title = searchMode ? 'Экипировка ' + searchMode.playerName : 'Экипировка';
	const columns = [];
	for (let index = 0; index < 13; index++) {
		const item = equipment[index];
		const list = bodyList[index];
		const active = !!(dragItem && list && list.indexOf(dragItem.itemId) !== -1);
		const focus = !!(dragItem && bodyFocus == index);
		const gradient = itemGradient(item, true);
		columns.push(
			<div
				key={index}
				className={cx(styles.column, active && styles.active, focus && styles.focus)}
				style={gradient ? { backgroundImage: gradient } : undefined}
				onMouseEnter={function () {
					onBodyItemEnter(index);
				}}
				onMouseLeave={function () {
					onBodyItemLeave();
				}}
			>
				{item && !item.search ? (
					<ItemView
						item={item}
						mode="body"
						debug={debug}
						dragging={!!(dragItem && dragItem.sqlId == item.sqlId)}
						onMouseEnter={function (e) {
							onItemMouseEnter(item, e);
						}}
						onMouseLeave={function () {
							onItemMouseLeave();
						}}
						onMouseMove={function (e) {
							onItemMouseMove(item, e);
						}}
						onMouseDown={function (e) {
							onItemMouseDown(item, e);
						}}
						onContextMenu={function (e) {
							onItemContextMenu(item, e);
						}}
					/>
				) : null}
			</div>
		);
	}

	return (
		<div className={styles.equipment}>
			<div className={styles.header}>
				<div className={styles.title}>{title}</div>
			</div>
			<div className={styles.body} style={slotStyle}>
				{columns}
			</div>
			<Starvation />
		</div>
	);
}

export default memo(Equipment);
