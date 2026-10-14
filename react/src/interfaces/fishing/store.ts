import { create } from 'zustand';

interface FishingState {
	show: boolean;
	position: number;
	zone: number | null;
	isStarted: boolean;
	isFetch: boolean;
	direction: string;
	weight: number | null;
	isEnd: boolean;
}

export const useFishingStore = create<FishingState>(() => ({
	show: false,
	position: 0,
	zone: null,
	isStarted: false,
	isFetch: false,
	direction: 'right',
	weight: null,
	isEnd: false,
}));

let intervalFishingB: number | null = null;
let synced = false;

function stopInterval() {
	if (intervalFishingB !== null) {
		window.clearInterval(intervalFishingB);
		intervalFishingB = null;
	}
}

export function moveCursor() {
	const state = useFishingStore.getState();
	const oldPosition = state.position;
	let position = oldPosition;

	if (state.direction === 'right') position++;
	if (state.direction === 'left') position--;

	useFishingStore.setState({ position: position });

	if (oldPosition === 93) {
		useFishingStore.setState({ direction: 'left' });
	}

	if (oldPosition === 1) {
		if (useFishingStore.getState().direction === 'left') {
			useFishingStore.setState({ isEnd: true });
			stopInterval();
			mp.trigger('fishing.game.end', false);
			return;
		}
		useFishingStore.setState({ direction: 'right' });
	}
}

export function fishFetch(speed: number, zone: number, weight: number) {
	useFishingStore.setState({
		isFetch: true,
		zone: zone,
		weight: weight,
	});
	intervalFishingB = window.setInterval(moveCursor, speed);
}

export function endFishing() {
	stopInterval();
	const state = useFishingStore.getState();
	const zone = state.zone == null ? 0 : state.zone;
	const result = Math.abs(state.position + 3 - 50) < parseInt(String(zone / 2), 10);
	mp.trigger('fishing.game.end', result);
}

export function clearFishingData() {
	useFishingStore.setState({
		position: 0,
		weight: null,
		zone: null,
		direction: 'right',
		isStarted: false,
		isFetch: false,
		isEnd: false,
	});
}

export function setFishingShow(val: boolean) {
	useFishingStore.setState({ show: !!val });
}

export function setFishingStarted(val: boolean) {
	useFishingStore.setState({ isStarted: !!val });
}

export function initFishingLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.fishing || {};

	function bind(key: keyof FishingState, write: (val: any) => void) {
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get: function () {
				return useFishingStore.getState()[key];
			},
			set: write,
		});
	}

	bind('show', function (val: boolean) {
		setFishingShow(val);
	});
	bind('isStarted', function (val: boolean) {
		setFishingStarted(val);
	});
	bind('position', function (val: number) {
		useFishingStore.setState({ position: val });
	});
	bind('zone', function (val: number | null) {
		useFishingStore.setState({ zone: val });
	});
	bind('isFetch', function (val: boolean) {
		useFishingStore.setState({ isFetch: !!val });
	});
	bind('direction', function (val: string) {
		useFishingStore.setState({ direction: val });
	});
	bind('weight', function (val: number | null) {
		useFishingStore.setState({ weight: val });
	});
	bind('isEnd', function (val: boolean) {
		const next = !!val;
		const prev = useFishingStore.getState().isEnd;
		useFishingStore.setState({ isEnd: next });
		if (next && !prev) {
			stopInterval();
			mp.trigger('fishing.game.end', false);
		}
	});

	target.moveCursor = moveCursor;
	target.fishFetch = fishFetch;
	target.endFishing = endFishing;
	target.clearData = clearFishingData;
	win.fishing = target;
}
