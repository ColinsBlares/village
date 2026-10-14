import { create } from 'zustand';

export interface BugItem {
	name: string;
	steps: string[];
	result: string;
	expectedResult: string;
	author: string;
	executor: string;
	state: string;
	build: number | string;
	date: string;
}

export interface BugForm {
	name: string;
	steps: string[];
	result: string;
	expectedResult: string;
}

interface BugTrackerState {
	show: boolean;
	score: number;
	bugList: BugItem[];
	bugI: number;
	form: BugForm;
}

const STEPS_MAX = 20;
const PLACEHOLDERS = [
	'Надеть бронежилет',
	'Изменить HP бронежилета',
	'Войти в магазин одежды',
	'Выйти из магазина одежды',
	'Залезть в авто',
	'Достать предмет',
	'Вызвать такси',
];

const EMPTY_FORM: BugForm = {
	name: '',
	steps: [''],
	result: '',
	expectedResult: '',
};

export const useBugTrackerStore = create<BugTrackerState>(() => ({
	show: false,
	score: 0,
	bugList: [],
	bugI: -1,
	form: {
		name: '',
		steps: [''],
		result: '',
		expectedResult: '',
	},
}));

let synced = false;

function emptyForm(): BugForm {
	return {
		name: '',
		steps: [''],
		result: '',
		expectedResult: '',
	};
}

function notifyBug(text: string) {
	const notifications = (window as any).notifications;
	if (notifications && notifications.error) notifications.error(text, 'Помощь штату');
}

function applyShowSideEffects(show: boolean) {
	mp.trigger('blur', show, 300);
	const hud = (window as any).hud;
	if (hud) hud.keysShow = !show;
	const busy = (window as any).busy;
	const prompt = (window as any).prompt;
	if (show) {
		if (busy && busy.add) busy.add('bugTracker', true, true);
		if (prompt && prompt.showByName) prompt.showByName('bugTracker_exit');
	} else {
		if (busy && busy.remove) busy.remove('bugTracker', true);
		if (prompt && prompt.hide) prompt.hide();
	}
}

export function setBugTrackerShow(val: boolean) {
	const show = !!val;
	const prev = useBugTrackerStore.getState().show;
	if (prev === show) return;
	useBugTrackerStore.setState({ show: show });
	applyShowSideEffects(show);
}

export function setBugScore(val: number) {
	useBugTrackerStore.setState({ score: val });
}

export function clearBugForm() {
	useBugTrackerStore.setState({ form: emptyForm() });
}

export function initBugList(list: any) {
	let bugs = list;
	if (typeof bugs == 'string') bugs = JSON.parse(bugs);
	useBugTrackerStore.setState({ bugList: bugs || [] });
}

export function addBug(bug: any) {
	let item = bug;
	if (typeof item == 'string') item = JSON.parse(item);
	useBugTrackerStore.setState(function (state) {
		return { bugList: state.bugList.concat([item]) };
	});
}

export function onClickBug(index: number) {
	const current = useBugTrackerStore.getState().bugI;
	const bugI = current == index ? -1 : index;
	useBugTrackerStore.setState({ bugI: bugI });
	if (bugI == -1) clearBugForm();
}

export function setBugFormName(name: string) {
	useBugTrackerStore.setState(function (state) {
		return { form: { ...state.form, name: name } };
	});
}

export function setBugFormResult(result: string) {
	useBugTrackerStore.setState(function (state) {
		return { form: { ...state.form, result: result } };
	});
}

export function setBugFormExpected(expectedResult: string) {
	useBugTrackerStore.setState(function (state) {
		return { form: { ...state.form, expectedResult: expectedResult } };
	});
}

export function setBugStep(index: number, value: string) {
	useBugTrackerStore.setState(function (state) {
		const steps = state.form.steps.slice();
		steps[index] = value;
		return { form: { ...state.form, steps: steps } };
	});
}

export function addBugStep() {
	const steps = useBugTrackerStore.getState().form.steps;
	if (steps.length >= STEPS_MAX) return;
	useBugTrackerStore.setState(function (state) {
		return { form: { ...state.form, steps: state.form.steps.concat(['']) } };
	});
}

export function onKeyDownStep(keyCode: number, index: number) {
	const steps = useBugTrackerStore.getState().form.steps.slice();
	const step = steps[index] || '';
	if (keyCode == 8 && !step.length) {
		steps.splice(index, 1);
		useBugTrackerStore.setState(function (state) {
			return { form: { ...state.form, steps: steps } };
		});
	} else if (keyCode == 13 && step.length) {
		if (steps.length >= STEPS_MAX) return;
		steps.push('');
		useBugTrackerStore.setState(function (state) {
			return { form: { ...state.form, steps: steps } };
		});
	}
}

export function stepPlaceholder(index: number) {
	return PLACEHOLDERS[index % PLACEHOLDERS.length];
}

export function createBug() {
	const form = useBugTrackerStore.getState().form;
	const fillSteps = form.steps.filter(function (step) {
		return step.length > 0;
	});
	if (!form.name.length) return notifyBug('Введите название');
	if (!fillSteps.length) return notifyBug('Добавьте шаги воспроизведения');
	if (!form.result.length) return notifyBug('Введите результат');
	if (!form.expectedResult.length) return notifyBug('Введите ожидаемый результат');

	const data = {
		name: form.name,
		steps: fillSteps,
		result: form.result,
		expectedResult: form.expectedResult,
	};
	clearBugForm();
	mp.trigger('callRemote', 'bugTracker.bug.create', JSON.stringify(data));
}

export function initBugTrackerLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.bugTracker || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useBugTrackerStore.getState().show;
		},
		set: function (val: boolean) {
			setBugTrackerShow(!!val);
		},
	});

	Object.defineProperty(target, 'score', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useBugTrackerStore.getState().score;
		},
		set: function (val: number) {
			setBugScore(val);
		},
	});

	target.initBugList = initBugList;
	target.addBug = addBug;
	win.bugTracker = target;

	window.addEventListener('keyup', function (e) {
		if (e.keyCode == 27 && useBugTrackerStore.getState().show) {
			setBugTrackerShow(!useBugTrackerStore.getState().show);
		}
	});
}

export { EMPTY_FORM, STEPS_MAX };
