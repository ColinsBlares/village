import React, { memo } from 'react';
import { cx } from '../../cx';
import { isColumnAccess, onColumnMouse, onItemContextMenu, onItemMouseDown, onItemMouseEnter, onItemMouseLeave, onItemMouseMove } from '../../model';
import { useInventoryStore } from '../../store';
import { useTradeStore } from '../../../trade/store';
import ItemView from '../ItemView';
import styles from './index.module.css';

type PocketProps = {
	place: any;
	contextMenu: boolean;
	scope: 'equipment' | 'environment';
	readonly?: boolean;
};

function Pocket(props: PocketProps) {
	const scopeData = useInventoryStore(function (store) {
		return props.scope === 'environment' ? store.environment : store.equipment;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	const placeSqlId = useInventoryStore(function (store) {
		return store.access.placeSqlId;
	});
	const pocketI = useInventoryStore(function (store) {
		return store.access.pocketI;
	});
	const deny = useInventoryStore(function (store) {
		return store.access.deny;
	});
	const targetSqlId = useInventoryStore(function (store) {
		return store.access.targetSqlId;
	});
	const columns = useInventoryStore(function (store) {
		return store.access.columns;
	});
	const dragSqlId = useInventoryStore(function (store) {
		return store.dragItem ? store.dragItem.sqlId : null;
	});
	const offerItems = useTradeStore(function (store) {
		return store.offerItems;
	});
	const tradeShow = useTradeStore(function (store) {
		return store.show;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	void scopeData;
	void itemsInfo;
	void placeSqlId;
	void pocketI;
	void deny;
	void targetSqlId;
	void columns;

	if (!props.place.showPockets) return null;

	return (
		<div className={styles.pockets}>
			{props.place.pockets.map(function (pocket: any, pocketIndex: number) {
				if (pocket.search) return null;
				const count = pocket.cols * pocket.rows;
				const cells = [];
				for (let index = 0; index < count; index++) {
					const item = pocket.items[index];
					const hidden = props.scope === 'equipment' && tradeShow && item && offerItems.some(function (entry) { return entry.sqlId == item.sqlId; });
					const access = isColumnAccess(index, pocket, props.place);
					cells.push(
						<div
							key={index}
							className={cx(styles.column, access && styles.access, access && deny && styles.deny, access && targetSqlId && styles.merge)}
							onMouseEnter={function () {
								onColumnMouse(props.place, pocket, index, 'mouseenter');
							}}
							onMouseLeave={function () {
								onColumnMouse(props.place, pocket, index, 'mouseleave');
							}}
						>
							{item && !item.search && !hidden ? (
								<ItemView
									item={item}
									mode="pocket"
									debug={debug}
									dragging={dragSqlId != null && dragSqlId == item.sqlId}
									onMouseEnter={function (e) {
										onItemMouseEnter(item, e);
									}}
									onMouseLeave={function () {
										onItemMouseLeave();
									}}
									onMouseMove={function (e) {
										onItemMouseMove(item, e);
									}}
									onMouseDown={props.readonly ? undefined : function (e) {
										onItemMouseDown(item, e);
									}}
									onContextMenu={props.contextMenu ? function (e) {
										onItemContextMenu(item, e);
									} : undefined}
								/>
							) : null}
						</div>
					);
				}
				return (
					<div key={pocketIndex} className={styles.items} style={{ gridTemplateColumns: 'repeat(' + pocket.cols + ', 1fr)' }}>
						{cells}
					</div>
				);
			})}
		</div>
	);
}

export default memo(Pocket);
