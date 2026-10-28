import { useInventoryStore } from '../inventory/store';
import { TradeItem, useTradeStore } from './store';

export const TRADE_GIVE = -101;
export const TRADE_TAKE = -102;

const COLS = 12;
const ROWS = 6;

function infoOf(itemId: number) {
	const info = useInventoryStore.getState().itemsInfo[itemId];
	return {
		width: info && info.width ? info.width : 1,
		height: info && info.height ? info.height : 1,
	};
}

function pack(entries: TradeItem[]) {
	const cells: Record<number, any> = {};
	const taken: boolean[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const size = infoOf(entry.itemId);
		let anchor = -1;
		for (let index = 0; index < COLS * ROWS; index++) {
			const x = index % COLS;
			const y = (index - x) / COLS;
			if (x + size.width > COLS || y + size.height > ROWS) continue;
			let free = true;
			for (let dx = 0; dx < size.width && free; dx++) {
				for (let dy = 0; dy < size.height; dy++) {
					if (taken[(y + dy) * COLS + (x + dx)]) free = false;
				}
			}
			if (!free) continue;
			anchor = index;
			for (let dx = 0; dx < size.width; dx++) {
				for (let dy = 0; dy < size.height; dy++) taken[(y + dy) * COLS + (x + dx)] = true;
			}
			break;
		}
		if (anchor === -1) continue;
		cells[anchor] = {
			sqlId: entry.sqlId,
			itemId: entry.itemId,
			params: entry.params || {},
		};
	}
	return cells;
}

export function tradePlace(sqlId: number, entries: TradeItem[]) {
	return {
		sqlId: sqlId,
		itemId: 0,
		showPockets: true,
		pockets: [{ cols: COLS, rows: ROWS, items: pack(entries) }],
	};
}

export function tradePlaces() {
	const trade = useTradeStore.getState();
	if (!trade.show) return [];
	return [tradePlace(TRADE_GIVE, trade.offerItems), tradePlace(TRADE_TAKE, trade.theirItems)];
}
