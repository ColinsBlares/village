import { create } from 'zustand';
import { events } from '@utils/shared/events';
import { SETTINGS_ORDER } from './data';

export interface InfoRecord {
	head: string;
	value: any;
	color?: string;
	moneyFilter?: boolean;
	minutesFilter?: boolean;
}

export interface SkillItem {
	head: string;
	value: number;
	jobId: number;
}

export interface SettingItem {
	type: string;
	head: string;
	pull?: string[];
	value: number;
}

export interface ConfirmationState {
	head: string;
	description: string;
	leftWord: string;
	rightWord: string;
	acceptHandler: () => void;
}

export interface StatisticsMap {
	[key: string]: InfoRecord;
}

export interface SettingsMap {
	[key: string]: SettingItem;
}

export interface PlayerMenuState {
	show: boolean;
	enable: boolean;
	inputFocus: boolean;
	lastShowTime: number;
	windowId: string;
	settingsWindow: string;
	donateWindow: string;
	name: string;
	admin: number;
	factionId: number;
	familyId: number;
	media: number;
	coins: number;
	time: string;
	date: string;
	codeMod: boolean;
	code: string;
	longName: boolean;
	confirmation: ConfirmationState | null;
	statistics: StatisticsMap;
	houseInfo: InfoRecord[];
	businessInfo: InfoRecord[];
	skills: SkillItem[];
	settingsList: SettingsMap;
	coefficient: number;
	nicknamePrice: number;
	clearWarnPrice: number;
	amountWarns: number;
	slotPrice: number;
	amountSlots: number;
	maxSlots: number;
	donateLicenses: any[];
	donateBundles: any[];
	donateCaseOpening: boolean;
	donateCaseResult: { caseName: string; price: number; prize: number } | null;
	licenses: { [key: string]: number };
	promocode: string;
	amountInvitees: number;
	amountCompleted: number;
	email: string;
	isConfirmed: any;
	passMessage: string;
	maxWaiting: number;
	protectionCodeMod: boolean;
	protectionWaiting: string;
	protectionSeconds: number;
}

function stat(head: string, value: any, color?: string, moneyFilter?: boolean, minutesFilter?: boolean): InfoRecord {
	const item: InfoRecord = { head: head, value: value };
	if (color) item.color = color;
	if (moneyFilter) item.moneyFilter = true;
	if (minutesFilter) item.minutesFilter = true;
	return item;
}

function defaultStatistics(): StatisticsMap {
	return {
		minutes: stat('Времени на сервере', '-', undefined, false, true),
		sex: stat('Пол', '-'),
		spouse: stat('Семейное положение', '-'),
		cash: stat('Денег на руках', 0, '#0f0', true),
		number: stat('Номер', '-'),
		factionName: stat('Организация', '-'),
		factionRank: stat('Должность', '-'),
		family: stat('Семья', '-'),
		jobName: stat('Работа', '-'),
		familiar: stat('Знакомые', '-'),
		wanted: stat('Ур. розыска', '-'),
		law: stat('Законопослушность', '-'),
		crimes: stat('Преступления', '-'),
		fines: stat('Штрафы', '-'),
		narcotism: stat('Наркозависимость', '-'),
		nicotine: stat('Зависимость от никотина', '-'),
	};
}

function defaultHouse(): InfoRecord[] {
	return [
		stat('Номер', '-'),
		stat('Улица', '-'),
		stat('Класс', '-'),
		stat('Комнат', 0),
		stat('Вместительность гаража', 0),
		stat('Гос. стоимость', 0, '#0f0', true),
	];
}

function defaultBusiness(): InfoRecord[] {
	return [
		stat('Тип', '-'),
		stat('Имя', '-'),
		stat('Номер', 0),
		stat('Улица', '-'),
		stat('Гос. стоимость', 0, '#0f0', true),
	];
}

function defaultSettings(): SettingsMap {
	return {
		spawn: {
			type: 'scroll',
			head: 'Место спавна',
			pull: ['Улица', 'Дом', 'Организация'],
			value: 1,
		},
		chatTimestamp: {
			type: 'scroll',
			head: 'Время в чате',
			pull: ['Выкл', 'Вкл'],
			value: 0,
		},
		chatSize: {
			type: 'scroll',
			head: 'Размер чата',
			pull: ['Мелкий', 'Обычный', 'Крупный', 'Огромный'],
			value: 0,
		},
		nicknames: {
			type: 'scroll',
			head: 'Никнеймы',
			pull: ['Выкл', 'Вкл'],
			value: 0,
		},
		hudKeys: {
			type: 'scroll',
			head: 'Подсказки кнопок',
			pull: ['Выкл', 'Вкл'],
			value: 0,
		},
		ghetto: {
			type: 'scroll',
			head: 'Гетто/рекеты на карте',
			pull: ['Выкл', 'Вкл'],
			value: 0,
		},
		walking: {
			type: 'scroll',
			head: 'Походка',
			pull: ['Обычная', 'Храбрая', 'Уверенная', 'Гангстер', 'Быстрая', 'Грустная', 'Крылатая'],
			value: 0,
		},
		mood: {
			type: 'scroll',
			head: 'Эмоция',
			pull: ['Обычный', 'Угрюмый', 'Сердитый', 'Счастливый', 'Счастливый', 'Стресс', 'Надутый'],
			value: 0,
		},
	};
}

export const usePlayerMenuStore = create<PlayerMenuState>(() => ({
	show: false,
	enable: false,
	inputFocus: false,
	lastShowTime: 0,
	windowId: 'character',
	settingsWindow: 'settings-main',
	donateWindow: 'donate-convert',
	name: 'Cyrus Raider',
	admin: 1,
	factionId: 0,
	familyId: 0,
	media: 0,
	coins: 1000,
	time: '00:00',
	date: '00.00.0000',
	codeMod: false,
	code: '',
	longName: false,
	confirmation: null,
	statistics: defaultStatistics(),
	houseInfo: defaultHouse(),
	businessInfo: defaultBusiness(),
	skills: [],
	settingsList: defaultSettings(),
	coefficient: 123,
	nicknamePrice: 120,
	clearWarnPrice: 120,
	amountWarns: 1,
	slotPrice: 120,
	amountSlots: 2,
	maxSlots: 5,
	donateLicenses: [],
	donateBundles: [],
	donateCaseOpening: false,
	donateCaseResult: null,
	licenses: {},
	promocode: 'LDLSF3',
	amountInvitees: 4,
	amountCompleted: 0,
	email: 'erf233423h4@324',
	isConfirmed: false,
	passMessage: 'изменён 4 дня назад',
	maxWaiting: 60,
	protectionCodeMod: false,
	protectionWaiting: '',
	protectionSeconds: 0,
}));

let dateTimer: number | null = null;
let minutesTimer: number | null = null;
let protectionInterval: number | null = null;

function parseMaybe(data: any) {
	if (typeof data === 'string') return JSON.parse(data);
	return data;
}

function convertToMoscowDate(date: Date) {
	const offsetMs = date.getTimezoneOffset() * 60 * 1000;
	const moscowOffsetMs = 3 * 60 * 60 * 1000;
	return new Date(date.getTime() + offsetMs + moscowOffsetMs);
}

function updateMenuClock() {
	const date = convertToMoscowDate(new Date());
	let hours: string | number = date.getHours();
	let minutes: string | number = date.getMinutes();
	let day: string | number = date.getDate();
	let month: string | number = date.getMonth() + 1;
	const year = date.getUTCFullYear();
	if (hours < 10) hours = '0' + hours;
	if (minutes < 10) minutes = '0' + minutes;
	if (day < 10) day = '0' + day;
	if (month < 10) month = '0' + month;
	usePlayerMenuStore.setState({
		time: hours + ':' + minutes,
		date: day + '.' + month + '.' + year,
	});
}

function stopDateTimer() {
	if (dateTimer !== null) {
		window.clearInterval(dateTimer);
		dateTimer = null;
	}
}

function startDateTimer() {
	stopDateTimer();
	updateMenuClock();
	dateTimer = window.setInterval(updateMenuClock, 60000);
}

function withStat(statistics: StatisticsMap, key: string, value: any): StatisticsMap {
	return {
		...statistics,
		[key]: {
			...statistics[key],
			value: value,
		},
	};
}

function setStatValue(key: string, value: any) {
	const statistics = usePlayerMenuStore.getState().statistics;
	usePlayerMenuStore.setState({
		statistics: withStat(statistics, key, value),
	});
}

function startMinutesTimer() {
	if (minutesTimer !== null) {
		window.clearInterval(minutesTimer);
	}
	minutesTimer = window.setInterval(function () {
		const record = usePlayerMenuStore.getState().statistics.minutes;
		let value = record.value;
		value++;
		setStatValue('minutes', value);
	}, 60000);
}

function callBrowserEvent(name: string, ...args: any[]) {
	events.call(name, ...args);
	if (typeof mp === 'undefined') return;
	const legacy = (mp as any).events;
	if (legacy && legacy !== events && typeof legacy.call === 'function') {
		legacy.call(name, ...args);
	}
}

function applySettingEffect(key: string, value: any) {
	if (key == 'chatTimestamp') {
		callBrowserEvent('setTimeChat', !!value);
	} else if (key == 'chatSize') {
		callBrowserEvent('setSizeChat', value + 1);
	} else if (key == 'nicknames') {
		mp.trigger('nametags.show', !!value);
	} else if (key == 'hudKeys') {
		const hud = (window as any).hud;
		if (hud) hud.keysShow = !!value;
	} else if (key == 'ghetto') {
		mp.trigger('bands.bandZones.show', !!value);
		mp.trigger('mafia.mafiaZones.show', !!value);
	}
}

function clearProtectionInterval() {
	if (protectionInterval !== null) {
		window.clearInterval(protectionInterval);
		protectionInterval = null;
	}
}

function buildHouse(house: any): InfoRecord[] {
	if (!house) return [];
	return [
		stat('Номер', house.id),
		stat('Улица', house.street),
		stat('Класс', house.class),
		stat('Комнат', house.rooms),
		stat('Вместительность гаража', house.carPlaces),
		stat('Гос. стоимость', house.price, '#0f0', true),
	];
}

function buildBiz(biz: any): InfoRecord[] {
	if (!biz) return [];
	return [
		stat('Тип', biz.type),
		stat('Имя', biz.name),
		stat('Номер', biz.id),
		stat('Улица', biz.street),
		stat('Гос. стоимость', biz.price, '#0f0', true),
	];
}

export function splitMoney(value: any) {
	return (value + '').replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

export function formatMoney(value: any) {
	return splitMoney(value) + ' $';
}

export function formatMinutes(value: any) {
	const hours = parseInt(String(value / 60), 10);
	if (!hours) return value + ' мин.';
	const minutes = value % 60;
	return hours + ' ч ' + minutes + ' мин';
}

export function formatRecordValue(record: InfoRecord) {
	let value = record.value;
	if (record.moneyFilter) value = formatMoney(value);
	if (record.minutesFilter) value = formatMinutes(value);
	return value;
}

export function getSocialStatus(admin: number, media: number, factionId: number) {
	if (admin) return 1;
	if (media) return 4;
	if (!factionId) return 0;
	if (factionId < 8) return 2;
	return 3;
}

export function cloneSettings(list: SettingsMap): SettingsMap {
	const next: SettingsMap = {};
	SETTINGS_ORDER.forEach(function (key) {
		const item = list[key];
		if (!item) return;
		next[key] = {
			type: item.type,
			head: item.head,
			value: item.value,
			pull: item.pull ? item.pull.slice() : undefined,
		};
	});
	return next;
}

export function setPlayerMenuShow(val: boolean) {
	const prev = usePlayerMenuStore.getState().show;
	if (prev === val) return;
	usePlayerMenuStore.setState({
		show: val,
		lastShowTime: Date.now(),
	});
	mp.trigger('blur', val, 300);
	const hud = (window as any).hud;
	if (hud) hud.show = !val;
	const busy = (window as any).busy;
	if (val) {
		if (busy) busy.add('playerMenu', true, true);
		mp.trigger('radar.display', false);
		mp.trigger('chat.opacity.set', 0);
		startDateTimer();
	} else {
		if (busy) busy.remove('playerMenu', true);
		mp.trigger('radar.display', true);
		mp.trigger('chat.opacity.set', 1);
		stopDateTimer();
	}
}

export function setWindow(windowId: string) {
	usePlayerMenuStore.setState({ windowId: windowId });
}

export function setSettingsWindow(windowId: string) {
	usePlayerMenuStore.setState({ settingsWindow: windowId });
}

export function setDonateWindow(windowId: string) {
	usePlayerMenuStore.setState({ donateWindow: windowId });
}

export function setInputFocus(enable: boolean) {
	usePlayerMenuStore.setState({ inputFocus: enable });
}

export function setPromoCode(code: string) {
	usePlayerMenuStore.setState({ code: code });
}

function setCodeMod(val: boolean) {
	if (val) {
		usePlayerMenuStore.setState({ codeMod: true, code: '' });
		return;
	}
	usePlayerMenuStore.setState({ codeMod: false });
}

export function showConfirmWindow(
	head: string,
	description: string,
	handler: () => void,
	leftWord?: string,
	rightWord?: string,
) {
	usePlayerMenuStore.setState({
		confirmation: {
			head: head,
			description: description,
			leftWord: leftWord ? leftWord : 'Принять',
			rightWord: rightWord ? rightWord : 'Отказаться',
			acceptHandler: handler,
		},
	});
}

export function acceptConfirmation() {
	const confirmation = usePlayerMenuStore.getState().confirmation;
	if (!confirmation) return;
	confirmation.acceptHandler();
	usePlayerMenuStore.setState({ confirmation: null });
}

export function closeConfirmation() {
	usePlayerMenuStore.setState({
		confirmation: null,
		codeMod: false,
	});
}

export function sendCode() {
	const code = usePlayerMenuStore.getState().code;
	if (code) mp.trigger('callRemote', 'promocodes.activate', code);
	usePlayerMenuStore.setState({ codeMod: false });
}

export function enterCode() {
	setCodeMod(true);
	showConfirmWindow(
		'Ввод промокода',
		'Промокод - краткий код, созданный админстрацией для<br /> поощрения игроков<br />\n                различными бонусами и игровой валютой\n                ',
		sendCode,
		'Подтвердить',
		'Назад',
	);
}

export function openFamilyControl() {
	if (!usePlayerMenuStore.getState().familyId) return;
	setPlayerMenuShow(false);
	const selectMenu = (window as any).selectMenu;
	if (selectMenu && selectMenu.showByName) {
		selectMenu.showByName('familyControl');
	}
}

export function requestKick() {
	showConfirmWindow(
		'Подтверждение действия',
		'Вы действительно хотите <br />\n                отключиться от сервера?\n                ',
		function () {
			mp.trigger('callRemote', 'playerMenu.kick');
		},
	);
}

export function setBiz(raw: any) {
	const biz = parseMaybe(raw);
	usePlayerMenuStore.setState({ businessInfo: buildBiz(biz) });
}

export function setHouse(raw: any) {
	const house = parseMaybe(raw);
	usePlayerMenuStore.setState({ houseInfo: buildHouse(house) });
}

export function setStatistics(raw: any) {
	const stats = parseMaybe(raw);
	let next = usePlayerMenuStore.getState().statistics;
	next = withStat(next, 'minutes', stats.minutes);
	next = withStat(next, 'sex', ['Мужской', 'Женский'][stats.gender]);
	next = withStat(next, 'cash', stats.cash);
	next = withStat(next, 'factionName', stats.factionName || '-');
	next = withStat(next, 'factionRank', stats.factionRank || '-');
	next = withStat(next, 'family', stats.family || '-');
	next = withStat(next, 'jobName', stats.jobName || '-');
	next = withStat(next, 'wanted', stats.wanted + ' зв.');
	next = withStat(next, 'law', stats.law);
	next = withStat(next, 'crimes', stats.crimes);
	next = withStat(next, 'fines', stats.fines);
	next = withStat(next, 'narcotism', stats.narcotism);
	next = withStat(next, 'nicotine', stats.nicotine);
	usePlayerMenuStore.setState({ statistics: next });
	startMinutesTimer();
}

export function setDonatePrice(raw: any) {
	const data = parseMaybe(raw);
	usePlayerMenuStore.setState({
		coefficient: data.convertCash,
		nicknamePrice: data.nicknamePrice,
		clearWarnPrice: data.clearWarnPrice,
		amountWarns: data.warns,
		slotPrice: data.slotPrice,
	});
}

export function setFaction(raw: any) {
	const data = parseMaybe(raw);
	let next = usePlayerMenuStore.getState().statistics;
	next = withStat(next, 'factionName', data.factionName || '-');
	next = withStat(next, 'factionRank', data.factionRank || '-');
	usePlayerMenuStore.setState({
		factionId: data.factionId,
		statistics: next,
	});
}

export function setFactionRank(raw: any) {
	const data = parseMaybe(raw);
	setStatValue('factionRank', data.factionRank || '-');
}

export function setFamily(raw: any) {
	const data = parseMaybe(raw);
	setStatValue('family', data.family || '-');
	usePlayerMenuStore.setState({ familyId: data.familyId || 0 });
}

export function setJob(raw: any) {
	const data = parseMaybe(raw);
	setStatValue('jobName', data.jobName || '-');
}

export function setWanted(wanted: any) {
	const statistics = usePlayerMenuStore.getState().statistics;
	const oldWanted = parseInt(statistics.wanted.value, 10);
	let next = withStat(statistics, 'wanted', wanted + ' зв.');
	if (wanted > oldWanted) {
		next = withStat(next, 'crimes', next.crimes.value + (wanted - oldWanted));
	}
	usePlayerMenuStore.setState({ statistics: next });
}

export function setFines(fines: any) {
	setStatValue('fines', fines);
}

export function setLaw(law: any) {
	setStatValue('law', law);
}

export function setNarcotism(narcotism: any) {
	setStatValue('narcotism', narcotism);
}

export function setNicotine(nicotine: any) {
	setStatValue('nicotine', nicotine);
}

export function setSkills(raw: any) {
	const data = parseMaybe(raw);
	const skills = usePlayerMenuStore.getState().skills.slice();
	data.forEach(function (skill: any) {
		skills.push({
			head: skill.name,
			value: skill.exp,
			jobId: skill.jobId,
		});
	});
	usePlayerMenuStore.setState({ skills: skills, enable: true });
}

export function setSkill(raw: any) {
	const data = parseMaybe(raw);
	const skills = usePlayerMenuStore.getState().skills;
	let index = -1;
	for (let i = 0; i < skills.length; i++) {
		if (skills[i].jobId == data.jobId) {
			index = i;
			break;
		}
	}
	if (index < 0) return;
	const skill = skills[index];
	const oldExp = skill.value;
	const nextSkills = skills.slice();
	nextSkills[index] = {
		head: skill.head,
		value: data.exp,
		jobId: skill.jobId,
	};
	usePlayerMenuStore.setState({ skills: nextSkills });
	if (parseInt(data.exp, 10) == parseInt(oldExp as any, 10)) return;
	const promptApi = (window as any).prompt;
	if (!promptApi || typeof promptApi.show !== 'function') return;
	const shown = parseInt(data.exp, 10);
	if (parseInt(data.exp, 10) > parseInt(oldExp as any, 10)) {
		promptApi.show("Навык '" + skill.head + "' повысился до " + shown + '%');
	} else {
		promptApi.show("Навык '" + skill.head + "' понизился до " + shown + '%');
	}
}

export function setCash(cash: any) {
	setStatValue('cash', cash);
}

export function setDonate(donate: number) {
	usePlayerMenuStore.setState({ coins: donate });
}

export function setWarns(warns: number) {
	usePlayerMenuStore.setState({ amountWarns: warns });
}

export function setSlots(slots: number) {
	usePlayerMenuStore.setState({ amountSlots: slots });
}

export function setPromocode(code: string) {
	usePlayerMenuStore.setState({ promocode: code });
}

export function setInvited(val: number) {
	usePlayerMenuStore.setState({ amountInvitees: val });
}

export function setCompleted(val: number) {
	usePlayerMenuStore.setState({ amountCompleted: val });
}

export function setMedia(val: number) {
	usePlayerMenuStore.setState({ media: val });
}

export function setPasswordDate(time: number) {
	const diff = Date.now() - time;
	usePlayerMenuStore.setState({
		passMessage: 'изменен ' + parseInt(String(diff / 1000 / 60 / 60 / 24), 10) + ' д. назад',
	});
}

export function setSettings(settings: any) {
	if (!settings || typeof settings !== 'object') return;
	const current = usePlayerMenuStore.getState().settingsList;
	const next: SettingsMap = {};
	Object.keys(current).forEach(function (key) {
		next[key] = current[key];
	});
	Object.keys(settings).forEach(function (key) {
		if (!next[key]) return;
		next[key] = {
			...next[key],
			value: settings[key],
		};
		applySettingEffect(key, settings[key]);
	});
	usePlayerMenuStore.setState({ settingsList: next });
}

export function setEmail(email: string, confirm: any = 0) {
	const prev = usePlayerMenuStore.getState().isConfirmed;
	const patch: Partial<PlayerMenuState> = {
		email: email,
		isConfirmed: confirm,
	};
	if (prev != confirm) {
		patch.protectionWaiting = '';
		clearProtectionInterval();
		if (confirm) patch.protectionCodeMod = false;
	}
	usePlayerMenuStore.setState(patch);
}

export function setName(name: string) {
	usePlayerMenuStore.setState({ name: name });
}

export function setAdmin(admin: number) {
	usePlayerMenuStore.setState({ admin: admin });
}

export function setNumber(number: any) {
	setStatValue('number', number);
}

export function setSpouse(raw: any) {
	const spouse = parseMaybe(raw);
	if (spouse) {
		const str = spouse.gender ? 'женат на ' : 'замужем за ';
		setStatValue('spouse', str + spouse.name);
	} else {
		setStatValue('spouse', '-');
	}
}

export function setFamiliar(count: any) {
	setStatValue('familiar', count);
}

export function initPlayerMenu(raw: any) {
	const data = parseMaybe(raw);
	usePlayerMenuStore.setState({
		name: data.playerName,
		coins: data.donate,
		admin: data.admin,
		factionId: data.factionId,
		familyId: data.familyId || 0,
		maxSlots: data.slotsMax,
		donateLicenses: data.donateCatalog ? data.donateCatalog.licenses || [] : [],
		donateBundles: data.donateCatalog ? data.donateCatalog.bundles || [] : [],
		licenses: data.licenses || {},
	});
	setBiz(data.biz);
	setHouse(data.house);
	setStatistics(data);
	setDonatePrice(data);
	setSlots(data.slots);
	setPromocode(data.promocode);
	setInvited(data.invited);
	setCompleted(data.completed);
	setMedia(data.media);
	setPasswordDate(data.passwordDate);
	setSettings(data.settings);
	setEmail(data.email, data.confirmEmail);
}

export function setDonateCatalog(raw: any) {
	const data = parseMaybe(raw);
	usePlayerMenuStore.setState({
		donateLicenses: data.donateCatalog ? data.donateCatalog.licenses || [] : [],
		donateBundles: data.donateCatalog ? data.donateCatalog.bundles || [] : [],
		licenses: data.licenses || {},
	});
}

export function acceptConvert(amount: any) {
	if (isNaN(amount) || amount <= 0) {
		const notifications = (window as any).notifications;
		if (notifications) notifications.push('error', 'Некорректное значение');
		return;
	}
	mp.trigger('callRemote', 'donate.convert', parseInt(amount, 10));
	const coins = usePlayerMenuStore.getState().coins;
	usePlayerMenuStore.setState({ coins: coins - amount });
}

export function acceptChange(firstname: string, lastname: string) {
	firstname = firstname[0].toUpperCase() + firstname.toLowerCase().substring(1, 20);
	lastname = lastname[0].toUpperCase() + lastname.toLowerCase().substring(1, 20);
	mp.trigger('callRemote', 'donate.nickname.set', firstname + ' ' + lastname);
}

export function takeoffWarn() {
	mp.trigger('callRemote', 'donate.warns.clear');
}

export function addSlot() {
	mp.trigger('callRemote', 'donate.slots.add');
}

export function buyDonateLicense(key: string) {
	mp.trigger('callRemote', 'donate.license.buy', key);
}

export function buyDonateBundle(id: string) {
	mp.trigger('callRemote', 'donate.bundle.buy', id);
}

export function buyDonateCase(caseId: string) {
	if (usePlayerMenuStore.getState().donateCaseOpening) return;
	usePlayerMenuStore.setState({ donateCaseOpening: true, donateCaseResult: null });
	mp.trigger('callRemote', 'donate.case.open', caseId);
}

export function setDonateCaseResult(raw: any) {
	const result = parseMaybe(raw);
	if (!result || typeof result.caseName !== 'string' || !Number.isFinite(Number(result.prize))) {
		throw new Error('Некорректный ответ донат-кейса');
	}
	usePlayerMenuStore.setState({
		donateCaseOpening: false,
		donateCaseResult: {
			caseName: result.caseName,
			price: Number(result.price),
			prize: Number(result.prize),
		},
	});
}

export function setDonateCaseFailed() {
	usePlayerMenuStore.setState({ donateCaseOpening: false });
}

export function clearDonateCaseResult() {
	usePlayerMenuStore.setState({ donateCaseResult: null });
}

export function saveSettings(modified: { [key: string]: number }) {
	setSettings(modified);
	mp.trigger('callRemote', 'settings.set', JSON.stringify(modified));
}

export function changeMail(mail: string) {
	mp.trigger('callRemote', 'settings.email.set', mail);
}

export function sendProtectionCode() {
	mp.trigger('callRemote', 'settings.email.confirm');
}

export function checkEmailCode(code: string) {
	mp.trigger('callRemote', 'settings.email.code.check', code);
}

export function changePassword(oldPass: string, newPass: string) {
	mp.trigger('callRemote', 'settings.password.set', JSON.stringify({
		oldPass: oldPass,
		newPass: newPass,
	}));
}

export function startProtectionWait() {
	const maxWaiting = usePlayerMenuStore.getState().maxWaiting;
	clearProtectionInterval();
	usePlayerMenuStore.setState({
		protectionCodeMod: true,
		protectionWaiting: '(' + maxWaiting + ')',
		protectionSeconds: 0,
	});
	protectionInterval = window.setInterval(function () {
		const seconds = usePlayerMenuStore.getState().protectionSeconds + 1;
		if (seconds > maxWaiting) {
			clearProtectionInterval();
			usePlayerMenuStore.setState({
				protectionSeconds: seconds,
				protectionWaiting: '',
			});
			return;
		}
		usePlayerMenuStore.setState({
			protectionSeconds: seconds,
			protectionWaiting: '(' + (maxWaiting - seconds) + ')',
		});
	}, 1000);
	sendProtectionCode();
}

export function cancelMailChange() {
	if (protectionInterval !== null) return false;
	usePlayerMenuStore.setState({
		protectionCodeMod: false,
		protectionWaiting: '',
	});
	return true;
}

function defineField(target: any, key: string, getter: () => any, setter: (val: any) => void) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		get: getter,
		set: setter,
	});
}

function onPlayerMenuKeyUp(e: KeyboardEvent) {
	const win = window as any;
	const busy = win.busy;
	if (
		busy &&
		busy.includes(['chat', 'terminal', 'interaction', 'mapCase', 'phone', 'inventory', 'inputWindow', 'playersList', 'bugTracker'])
	) {
		return;
	}
	if (win.selectMenu && win.selectMenu.isEditing) return;
	const state = usePlayerMenuStore.getState();
	if (Date.now() - state.lastShowTime < 500) return;
	if (!state.enable) return;
	if (e.keyCode == 77 && !state.inputFocus) setPlayerMenuShow(!state.show);
	if (e.keyCode == 27 && state.show) setPlayerMenuShow(false);
}

export function initPlayerMenuBridge() {
	if (typeof window === 'undefined') return;
	const win = window as any;
	const target = win.playerMenu || {};

	defineField(
		target,
		'show',
		function () {
			return usePlayerMenuStore.getState().show;
		},
		function (val) {
			setPlayerMenuShow(!!val);
		},
	);

	defineField(
		target,
		'codeMod',
		function () {
			return usePlayerMenuStore.getState().codeMod;
		},
		function (val) {
			setCodeMod(!!val);
		},
	);

	const fields = ['enable', 'inputFocus', 'name', 'admin', 'factionId', 'familyId', 'media', 'coins', 'code'];
	fields.forEach(function (key) {
		defineField(
			target,
			key,
			function () {
				return (usePlayerMenuStore.getState() as any)[key];
			},
			function (val) {
				usePlayerMenuStore.setState({ [key]: val } as Partial<PlayerMenuState>);
			},
		);
	});

	target.init = initPlayerMenu;
	target.setFaction = setFaction;
	target.setFactionRank = setFactionRank;
	target.setFamily = setFamily;
	target.setJob = setJob;
	target.setWanted = setWanted;
	target.setFines = setFines;
	target.setBiz = setBiz;
	target.setHouse = setHouse;
	target.setSkills = setSkills;
	target.setSkill = setSkill;
	target.setCash = setCash;
	target.setDonate = setDonate;
	target.setDonateCatalog = setDonateCatalog;
	target.setDonateCaseResult = setDonateCaseResult;
	target.setDonateCaseFailed = setDonateCaseFailed;
	target.setWarns = setWarns;
	target.setSlots = setSlots;
	target.setPromocode = setPromocode;
	target.setInvited = setInvited;
	target.setCompleted = setCompleted;
	target.setMedia = setMedia;
	target.setPasswordDate = setPasswordDate;
	target.setEmail = setEmail;
	target.setName = setName;
	target.setAdmin = setAdmin;
	target.setLaw = setLaw;
	target.setNarcotism = setNarcotism;
	target.setNicotine = setNicotine;
	target.setNumber = setNumber;
	target.setSpouse = setSpouse;
	target.setFamiliar = setFamiliar;
	target.setSettings = setSettings;
	target.setStatistics = setStatistics;
	target.setDonatePrice = setDonatePrice;
	target.showConfirmWindow = showConfirmWindow;
	target.openFamilyControl = openFamilyControl;
	target.enterCode = enterCode;
	target.sendCode = sendCode;

	win.playerMenu = target;

	if (!win.__playerMenuKeyBound) {
		win.__playerMenuKeyBound = true;
		window.addEventListener('keyup', onPlayerMenuKeyUp);
	}
}
