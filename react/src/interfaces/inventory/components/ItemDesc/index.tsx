import React, { memo } from 'react';
import { getDescParams, getEnvironmentItem, getItem, getItemName, itemStyle } from '../../model';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

function ItemDesc() {
	const desc = useInventoryStore(function (store) {
		return store.itemDesc;
	});
	const menuItem = useInventoryStore(function (store) {
		return store.itemMenu.item;
	});
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	const environment = useInventoryStore(function (store) {
		return store.environment;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	void equipment;
	void environment;

	const item = desc.item;
	if (!item || menuItem || dragItem) return null;
	if (!getItem(item.sqlId) && !getEnvironmentItem(item.sqlId)) return null;
	const info = itemsInfo[item.itemId];
	const params = getDescParams(item);

	return (
		<div className={styles.desc + ' inv-item-desc'} style={{ left: desc.x + 'px', top: desc.y + 'px' }}>
			<div className={styles.title}>{getItemName(item)}</div>
			{debug ? <div>itemId: #{item.itemId}</div> : null}
			<div className={styles.preview + ' inv-item'} style={itemStyle(item)}>
				{debug ? <div className={styles.sqlid}>#{item.sqlId}</div> : null}
				{item.params && item.params.count ? <div className={styles.count}>{item.params.count}</div> : null}
			</div>
			<div className={styles.description}>{info ? info.description : ''}</div>
			<div className={styles.params}>
				{params.map(function (param) {
					return (
						<div className={styles.param} key={param.name}>
							<div className={styles.name}>{param.name}</div>
							<div className={styles.value}>{param.value}</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(ItemDesc);
