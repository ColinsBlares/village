import TradeBoard from './components/Board';
import { initTradeLegacyBridge, useTradeStore } from './store';

export default {
	id: 'trade',
	Component: TradeBoard,
	order: 132,
	useVisible: () => false,
	init: initTradeLegacyBridge,
};

export function readOpen() {
	return false;
}

export function subscribe(listener: () => void) {
	return useTradeStore.subscribe(listener);
}
