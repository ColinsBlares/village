import { create } from 'zustand';
import { useVisibilityStore } from '@utils/visibility/store';

export interface SpeedometerState {
	isActive: boolean;
	headlights: number;
	lock: number;
	speed: number;
	fuel: number;
	maxFuel: number;
	mileage: number;
	danger: number;
	maxSpeed: number;
	arrow: number;
	emergency: number | boolean;
	isElectricCar: boolean;
	leftArrow: boolean;
	rightArrow: boolean;
}

export const useSpeedometerStore = create<SpeedometerState>(() => ({
	isActive: true,
	headlights: 0,
	lock: 1,
	speed: 50,
	fuel: 50,
	maxFuel: 70,
	mileage: 0,
	danger: 0,
	maxSpeed: 480,
	arrow: 0,
	emergency: 0,
	isElectricCar: false,
	leftArrow: false,
	rightArrow: false,
}));

const BRIDGE_KEYS: Array<keyof SpeedometerState> = [
	'isActive',
	'headlights',
	'lock',
	'speed',
	'fuel',
	'maxFuel',
	'mileage',
	'danger',
	'maxSpeed',
	'arrow',
	'emergency',
	'isElectricCar',
	'leftArrow',
	'rightArrow',
];

let arrowInterval: number | null = null;

function emergencyValue(emergency: number | boolean): number {
	if (emergency === true) {
		return 1;
	}
	if (emergency === false) {
		return 0;
	}
	return emergency;
}

function isEmergencyOn(emergency: number | boolean): boolean {
	return emergency === true || emergency === 1;
}

export function splitMileage(value: number | string): string {
	return ('' + value).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

function toggleArrows() {
	const state = useSpeedometerStore.getState();
	const emergencyOn = isEmergencyOn(state.emergency);

	useSpeedometerStore.setState({
		leftArrow: emergencyOn || state.arrow == 1 ? !state.leftArrow : false,
		rightArrow: emergencyOn || state.arrow == 2 ? !state.rightArrow : false,
	});
}

export function flickerLight() {
	if (arrowInterval !== null) {
		window.clearInterval(arrowInterval);
		arrowInterval = null;
	}

	const state = useSpeedometerStore.getState();
	if (!(state.arrow + emergencyValue(state.emergency))) {
		useSpeedometerStore.setState({
			leftArrow: false,
			rightArrow: false,
		});
		return;
	}

	toggleArrows();
	arrowInterval = window.setInterval(toggleArrows, 500);
}

export function showSpeedometer(flag: boolean) {
	useVisibilityStore.setState({ speedometer: !!flag });
}

export function setSpeedometerField(key: string, val: any) {
	if (key === 'show') {
		showSpeedometer(val);
		return;
	}

	const prev = (useSpeedometerStore.getState() as any)[key];
	if (prev === val) {
		return;
	}

	useSpeedometerStore.setState({ [key]: val } as Partial<SpeedometerState>);

	if (key === 'arrow' || key === 'emergency') {
		flickerLight();
	}
}

export function initSpeedometerLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.speedometer || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get() {
			return useVisibilityStore.getState().speedometer;
		},
		set(val: boolean) {
			showSpeedometer(val);
		},
	});

	BRIDGE_KEYS.forEach(key => {
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get() {
				return useSpeedometerStore.getState()[key];
			},
			set(val: any) {
				setSpeedometerField(key, val);
			},
		});
	});

	win.speedometer = target;
}
