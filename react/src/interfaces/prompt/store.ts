import { create } from 'zustand';
import { setHudData } from '../hud/store';

interface PromptItem {
	text: string;
	showTime?: number;
}

const PROMPTS: Record<string, PromptItem> = {
	select_menu: {
		text: 'Используйте <span>&uarr;</span> <span>&darr;</span> <span>&crarr;</span> для выбора пункта в меню.',
		showTime: 60000,
	},
	vehicle_engine: {
		text: 'Нажмите <span>2</span> для того, чтобы завести двигатель автомобиля',
	},
	vehicle_open_boot: {
		text: 'Нажмите <span>G</span> для того, чтобы открыть багажник',
	},
	vehicle_open_hood: {
		text: 'Нажмите <span>G</span> для того, чтобы открыть капот',
	},
	vehicle_close_boot: {
		text: 'Нажмите <span>G</span> для того, чтобы закрыть багажник',
	},
	vehicle_close_hood: {
		text: 'Нажмите <span>G</span> для того, чтобы закрыть капот',
	},
	vehicle_items_boot: {
		text: 'Нажмите <span>I</span> для того, чтобы взаимодействовать с содержимым багажника',
	},
	vehicle_autopilot: {
		text: 'Нажите <span>W</span> или уберите точку на карте для того, чтобы деактивировать автопилот',
	},
	faction_items_holder: {
		text: 'Нажмите <span>I</span> для того, чтобы взаимодействовать с содержимым шкафа организации',
	},
	house_items_holder: {
		text: 'Нажмите <span>I</span> для того, чтобы взаимодействовать с содержимым шкафа дома',
	},
	carshow_control: {
		text: 'Нажмите <span>Esc</span> для того, чтобы выйти из автосалона',
	},
	carmarket_noveh: {
		text: 'Чтобы продать транспортное средство, вы должны находиться в нем',
	},
	carmarket_control: {
		text: 'Нажмите <span>E</span> для того, чтобы продать транспортное средство',
	},
	documents_close: {
		text: 'Нажмите <span>Esc</span> для того, чтобы закрыть документ',
	},
	fuelstation_control: {
		text: 'Чтобы заправить транспортное средство, вы должны находиться за рулем',
	},
	take_ammobox: {
		text: 'Нажмите <span>E</span> для того, чтобы взять ящик с боеприпасами',
	},
	take_medicinesbox: {
		text: 'Нажмите <span>E</span> для того, чтобы взять ящик с медикаментами',
	},
	put_ammobox: {
		text: 'Нажмите <span>E</span> для того, чтобы положить ящик с боеприпасами',
	},
	put_medicinesbox: {
		text: 'Нажмите <span>E</span> для того, чтобы положить ящик с медикаментами',
	},
	garage_control: {
		text: 'Нажмите <span>E</span> для того, чтобы выехать из гаража',
	},
	biz_info_ask: {
		text: 'Нажмите <span>B</span> для просмотра информации о бизнесе',
	},
	farm_tax: {
		text: 'Налог. баланс фермы пополнен на сутки. Не забудьте дополнить, иначе ферма будет продана в штат.',
	},
	farm_job: {
		text: 'Собирайте созревший урожай на поле клавишей <span>E</span>, загрузите его в открытый багажник фермерского пикапа и доставьте на склад.',
	},
	farm_farmer: {
		text: 'Загрузите фермерский пикап на созревшем поле. Откройте багажник клавишей <span>G</span>, подойдите к урожаю и нажмите <span>E</span>. На складе фермы выгрузите урожай и получите премию.',
	},
	farm_farmer_start: {
		text: 'Работа фермера: найдите созревшее поле, соберите урожай клавишей <span>E</span> и перенесите его в открытый багажник фермерского пикапа.',
	},
	farm_farmer_collect: {
		text: 'Урожай в руках. Откройте багажник фермерского пикапа клавишей <span>G</span> и подойдите к нему, чтобы загрузить урожай.',
	},
	farm_farmer_deliver: {
		text: 'Пикап загружен. Вернитесь на склад своей фермы, выгрузите урожай и получите премию.',
	},
	farm_farmer_return: {
		text: 'Урожай сдан. Вернитесь к созревшему полю и повторите маршрут. Для получения зарплаты завершите работу у работодателя.',
	},
	farm_tractor: {
		text: 'Загрузите фермерский трактор зерном на складе. Посейте поле и получите премию.',
	},
	farm_pilot: {
		text: 'Загрузите самолет удобрением на складе. Оросите поля и получите премию.',
	},
	carrier_job: {
		text: 'Загрузите товар в грузовик и доставьте на ферму или бизнес. Следите за ценами, чтобы заработать больше.',
	},
	army_capture_attack_win: {
		text: 'Ваша команда победила в захвате',
	},
	army_capture_attack_lose: {
		text: 'Ваша команда проиграла в захвате',
	},
	army_capture_defender_win: {
		text: 'Ваша команда победила в обороне',
	},
	army_capture_defender_lose: {
		text: 'Ваша команда проиграла в обороне',
	},
	capture_attack_win: {
		text: 'Влияние вашей группировки увеличилось',
	},
	capture_attack_lose: {
		text: 'Вашей группировке не удалось увеличить влияние',
	},
	capture_defender_win: {
		text: 'Ваша группировка отстояла свою территорию',
	},
	capture_defender_lose: {
		text: 'Влияние вашей группировки уменьшилось',
	},
	bizWar_attack_win: {
		text: 'Влияние вашей мафии увеличилось, новый бизнес под крышей',
	},
	bizWar_attack_lose: {
		text: 'Вашей мафии не удалось увеличить влияние',
	},
	bizWar_defender_win: {
		text: 'Ваша мафия отстояла свой бизнес',
	},
	bizWar_defender_lose: {
		text: 'Влияние вашей мафии уменьшилось, потеряна крыша над бизнесом',
	},
	fishing: {
		text: 'Нажмите <span>ЛКМ</span>, чтобы начать рыбачить',
	},
	bin: {
		text: 'Нажмите <span>E</span>, чтобы покопаться в мусорке',
	},
	woodman_take_ax: {
		text: 'Достаньте топор, чтобы вырубить дерево',
	},
	woodman_start_ax: {
		text: 'Нажмите <span>ЛКМ</span>, чтобы начать рубить дерево',
	},
	woodman_log_take_ax: {
		text: 'Достаньте топор, чтобы разрубить бревно',
	},
	woodman_log_start_ax: {
		text: 'Нажмите <span>ЛКМ</span>, чтобы начать рубить бревно',
	},
	mason_take_pick: {
		text: 'Достаньте кирку, чтобы добыть камень',
	},
	mason_start_pick: {
		text: 'Нажмите <span>ЛКМ</span>, чтобы начать добывать камень',
	},
	animations_stop: {
		text: 'Нажмите <span>SPACE</span>, чтобы остановить анимацию',
	},
	clubs_buy: {
		text: 'Нажмите <span>E</span>, чтобы просмотреть ассортимент',
	},
	winter_job: {
		text: 'Очищайте дорогу от снега',
	},
	craft_exit: {
		text: 'Нажмите <span>Esc</span> для того, чтобы выйти',
	},
	bugTracker_exit: {
		text: 'Нажмите <span>Esc</span> для того, чтобы выйти',
	},
};

export interface PromptState {
	show: boolean;
	showTime: number;
	text: string | null;
}

export const usePromptStore = create<PromptState>(() => ({
	show: false,
	showTime: 10000,
	text: null,
}));

let showTimer: number | null = null;

function setOnline(showOnline: boolean) {
	setHudData({ showOnline: showOnline });
}

function armTimer() {
	if (showTimer !== null) {
		window.clearTimeout(showTimer);
	}
	const delay = usePromptStore.getState().showTime;
	showTimer = window.setTimeout(function () {
		hidePrompt();
	}, delay);
}

export function showPrompt(text: string) {
	usePromptStore.setState({ text: text, show: true });
	setOnline(false);
	armTimer();
}

export function showPromptByName(name: string) {
	const prompt = PROMPTS[name];
	if (!prompt) {
		return;
	}
	showPrompt(prompt.text);
}

export function hidePrompt() {
	if (showTimer !== null) {
		window.clearTimeout(showTimer);
		showTimer = null;
	}
	usePromptStore.setState({ text: null, show: false });
	setOnline(true);
}

export function initPromptLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	let target = win.prompt;
	if (!target || typeof target === 'function') {
		target = {};
	}

	target.show = showPrompt;
	target.hide = hidePrompt;
	target.showByName = showPromptByName;

	Object.defineProperty(target, 'text', {
		configurable: true,
		enumerable: true,
		get: function () {
			return usePromptStore.getState().text;
		},
		set: function (val: string | null) {
			usePromptStore.setState({ text: val, show: !!val });
		},
	});

	Object.defineProperty(target, 'showTime', {
		configurable: true,
		enumerable: true,
		get: function () {
			return usePromptStore.getState().showTime;
		},
		set: function (val: number) {
			usePromptStore.setState({ showTime: val });
		},
	});

	win.prompt = target;
}
