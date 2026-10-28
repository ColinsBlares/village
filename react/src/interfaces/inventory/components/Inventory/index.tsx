import React, { memo } from 'react';
import { cx } from '../../cx';
import { useInventoryStore } from '../../store';
import { useTradeStore } from '../../../trade/store';
import TradeBoard from '../../../trade/components/Board';
import Bin from '../Bin';
import Environment from '../Environment';
import Equipment from '../Equipment';
import Hands from '../Hands';
import Hotkeys from '../Hotkeys';
import ItemDesc from '../ItemDesc';
import ItemDrag from '../ItemDrag';
import ItemMenu from '../ItemMenu';
import ItemNotif from '../ItemNotif';
import PlayerInventory from '../PlayerInventory';
import styles from './index.module.css';

function Inventory() {
	const spin = useInventoryStore(function (store) {
		return store.spin;
	});
	const searchMode = useInventoryStore(function (store) {
		return store.searchMode;
	});
	const envEmpty = useInventoryStore(function (store) {
		return store.environment.length === 0;
	});
	const tradeOpen = useTradeStore(function (store) {
		return store.show;
	});
	const hideEnvironment = envEmpty || searchMode != null;
	const showTrade = tradeOpen && searchMode == null;
	const wide = !showTrade && hideEnvironment;

	return (
		<div id="inventory" className={cx(styles.root, spin && styles.spin, wide && styles.nonEnvironment)}>
			{showTrade ? <TradeBoard /> : hideEnvironment ? null : <Environment />}
			<Equipment />
			<PlayerInventory />
			<Hands />
			<Hotkeys />
			<ItemDesc />
			<ItemNotif />
			<ItemMenu />
			<ItemDrag />
			<Bin />
		</div>
	);
}

export default memo(Inventory);
