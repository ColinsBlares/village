import React, { memo } from 'react';
import arrowImg from '@imgs/inventory/arrow.svg';
import { cx } from '../../cx';
import {
	getCommonWeight,
	getItemName,
	getPlaceWeight,
	toggleShowPockets,
} from '../../model';
import { useInventoryStore } from '../../store';
import Pocket from '../Pocket';
import styles from './index.module.css';

function PlayerInventory() {
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	const maxPlayerWeight = useInventoryStore(function (store) {
		return store.maxPlayerWeight;
	});
	const searchMode = useInventoryStore(function (store) {
		return store.searchMode;
	});
	const searchList = useInventoryStore(function (store) {
		return store.searchList;
	});
	const dragSqlId = useInventoryStore(function (store) {
		return store.dragItem ? store.dragItem.sqlId : null;
	});
	void itemsInfo;

	const title = searchMode && searchList.length ? 'Обыск...' : 'Инвентарь';
	const keys = Object.keys(equipment);
	const containers = [];
	for (let i = 0; i < keys.length; i++) {
		const item = equipment[keys[i]];
		if (!item || !item.pockets) continue;
		const weight = +getPlaceWeight(item).toFixed(1);
		containers.push(
			<div
				key={item.sqlId}
				className={cx(
					styles.container,
					dragSqlId != null && dragSqlId == item.sqlId && styles.drag,
				)}
			>
				<div
					className={item.showPockets ? styles.header : styles.headerHidden}
					onClick={function () {
						toggleShowPockets(item);
					}}
				>
					<div className={styles.title}>{getItemName(item)}</div>
					<div className={styles.weight}>{weight} кг</div>
					<img
						className={item.showPockets ? styles.arrow : styles.arrowHidden}
						src={arrowImg}
						alt=''
					/>
				</div>
				<Pocket place={item} scope='equipment' contextMenu />
			</div>,
		);
	}

	return (
		<div className={styles.player}>
			<div className={styles.top}>
				<div className={styles.topTitle}>{title}</div>
				<div>
					Тяжесть {getCommonWeight()} из {maxPlayerWeight} кг
				</div>
			</div>
			<div className={styles.block}>{containers}</div>
		</div>
	);
}

export default memo(PlayerInventory);
