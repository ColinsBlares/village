import React, { memo } from 'react';
import styles from './index.module.css';
import { formatItemName, isDeficit, itemImage, itemName, materialLabel } from '../../logic';
import { onClickCraftItem, useCraftStore } from '../../store';

function ItemList() {
	const viewTick = useCraftStore(state => state.viewTick);
	const inventoryTick = useCraftStore(state => state.inventoryTick);
	const crafter = useCraftStore(state => state.crafter);
	if (!crafter) return null;
	const type = crafter.types[crafter.typeI];
	if (!type) return null;

	return (
		<div className={styles.list} data-tick={viewTick + inventoryTick}>
			{type.items.map(function (item, index) {
				const active = type.itemI == index;
				const className = active ? styles.item + ' ' + styles.active : styles.item;
				return (
					<div
						key={index}
						className={className}
						onClick={function () {
							onClickCraftItem(index);
						}}
					>
						<div className={styles.icon} style={{ backgroundImage: "url('" + itemImage(item.itemId) + "')" }} />
						<div className={styles.info}>
							<div className={styles.name}>{formatItemName(itemName(item.itemId))}</div>
							<div className={styles.materials}>
								{item.materials.map(function (mat, matIndex) {
									const deficit = isDeficit(mat);
									return (
										<div key={matIndex} className={deficit ? styles.deficit : undefined}>
											{materialLabel(item, mat)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default memo(ItemList);
