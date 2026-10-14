import ltd from '@imgs/supermarket/ltd.png';
import robsliquor from '@imgs/supermarket/robsliquor.png';
import supermarket from '@imgs/supermarket/supermarket.png';

export interface ShopItem {
	key: string;
	name: string;
	meta: string;
	art: string;
	priceKey: string;
	categoryId: string;
	action?: string;
	product?: number;
}

export const SHOP_TABS = [
	{ id: 'all', title: 'Все' },
	{ id: 'mobile', title: 'Связь' },
	{ id: 'food', title: 'Продукты' },
	{ id: 'tobacco', title: 'Табак' },
	{ id: 'bags', title: 'Сумки' },
	{ id: 'stuff', title: 'Прочее' },
];

export const SHOP_ITEMS: ShopItem[] = [
	{ key: 'phone', name: 'Телефон', meta: 'Смартфон', art: 'phone', priceKey: 'phone', categoryId: 'mobile', action: 'phone' },
	{ key: 'number', name: 'Новый номер', meta: '6 цифр', art: 'sim', priceKey: 'numberChange', categoryId: 'mobile', action: 'number' },
	{ key: 'water', name: 'Бутылка воды', meta: '0.5 л', art: 'water', priceKey: 'water', categoryId: 'food', product: 0 },
	{ key: 'chocolate', name: 'Шоколад', meta: 'Батончик', art: 'chocolate', priceKey: 'chocolate', categoryId: 'food', product: 1 },
	{ key: 'cigarettes', name: 'Redwood', meta: 'Сигареты', art: 'cigarettes', priceKey: 'cigarettes', categoryId: 'tobacco', product: 2 },
	{ key: 'bag-green', name: 'Зелёная сумка', meta: 'Наплечная', art: 'bagGreen', priceKey: 'duffleBag', categoryId: 'bags', product: 6 },
	{ key: 'bag-black', name: 'Чёрная сумка', meta: 'Наплечная', art: 'bagBlack', priceKey: 'duffleBag', categoryId: 'bags', product: 7 },
	{ key: 'rope', name: 'Верёвка', meta: 'Моток', art: 'rope', priceKey: 'rope', categoryId: 'stuff', product: 3 },
	{ key: 'sack', name: 'Мешок', meta: 'Ткань', art: 'sack', priceKey: 'bag', categoryId: 'stuff', product: 4 },
	{ key: 'canister', name: 'Канистра', meta: 'Топливо', art: 'canister', priceKey: 'canister', categoryId: 'stuff', product: 5 },
	{ key: 'medkit', name: 'Аптечка', meta: 'Первая помощь', art: 'medkit', priceKey: 'healthPack', categoryId: 'stuff', product: 8 },
	{ key: 'matches', name: 'Спички', meta: 'Коробок', art: 'matches', priceKey: 'matches', categoryId: 'stuff', product: 9 },
];

export const SHOP_HEADERS: Record<string, string> = {
	'ltd.png': ltd,
	'robsliquor.png': robsliquor,
	'supermarket.png': supermarket,
};

export const SHOP_ARTS: Record<string, string> = {
	phone: '<svg viewBox="0 0 120 90"><rect x="42" y="8" width="36" height="70" rx="6" fill="#1b1b1b" stroke="#f5c400" stroke-width="2"/><rect x="46" y="16" width="28" height="48" rx="2" fill="#243044"/><circle cx="60" cy="70" r="2.2" fill="#f5c400"/></svg>',
	sim: '<svg viewBox="0 0 120 90"><path d="M38 18h28l16 16v40H38V18z" fill="#f5c400"/><rect x="46" y="40" width="24" height="22" rx="2" fill="#1b1b1b"/><path d="M50 46h6v6h-6zm10 0h6v6h-6zM50 54h16v4H50z" fill="#f5c400"/></svg>',
	water: '<svg viewBox="0 0 120 90"><path d="M52 10h16l4 12v50a12 12 0 0 1-24 0V22l4-12z" fill="#7fd0ea"/><path d="M54 28h12v28a6 6 0 0 1-12 0V28z" fill="#d9f4ff" opacity=".7"/><rect x="54" y="8" width="12" height="6" rx="1" fill="#cfd8dc"/></svg>',
	chocolate: '<svg viewBox="0 0 120 90"><rect x="28" y="22" width="64" height="46" rx="4" fill="#6b3a22"/><path d="M28 32h64v8H28z" fill="#f5c400"/><path d="M48 22v46M68 22v46M28 48h64" stroke="#4a2616" stroke-width="2"/></svg>',
	cigarettes: '<svg viewBox="0 0 120 90"><rect x="34" y="16" width="52" height="58" rx="3" fill="#c62828"/><rect x="34" y="16" width="52" height="16" fill="#f5f5f5"/><text x="60" y="58" text-anchor="middle" font-size="11" font-family="Montserrat,sans-serif" fill="#fff">RED</text></svg>',
	bagGreen: '<svg viewBox="0 0 120 90"><path d="M40 36h40l6 40H34l6-40z" fill="#2e7d32"/><path d="M48 36c0-10 24-10 24 0" fill="none" stroke="#1b1b1b" stroke-width="3"/><rect x="52" y="48" width="16" height="10" rx="1" fill="#f5c400"/></svg>',
	bagBlack: '<svg viewBox="0 0 120 90"><path d="M40 36h40l6 40H34l6-40z" fill="#2a2a2a" stroke="#666" stroke-width="1"/><path d="M48 36c0-10 24-10 24 0" fill="none" stroke="#f5c400" stroke-width="3"/><rect x="52" y="48" width="16" height="10" rx="1" fill="#f5c400"/></svg>',
	rope: '<svg viewBox="0 0 120 90"><ellipse cx="60" cy="48" rx="26" ry="16" fill="none" stroke="#c4a574" stroke-width="6"/><ellipse cx="60" cy="48" rx="14" ry="8" fill="none" stroke="#8d6e45" stroke-width="5"/><path d="M78 40c16 4 18 18 8 24" fill="none" stroke="#c4a574" stroke-width="5"/></svg>',
	sack: '<svg viewBox="0 0 120 90"><path d="M44 28c8-12 24-12 32 0l8 40c-6 10-42 10-48 0l8-40z" fill="#d7c4a3"/><path d="M48 30h24" stroke="#8d6e45" stroke-width="3"/><path d="M52 26c4 6 12 6 16 0" fill="none" stroke="#8d6e45" stroke-width="2"/></svg>',
	canister: '<svg viewBox="0 0 120 90"><rect x="40" y="24" width="36" height="50" rx="4" fill="#d32f2f"/><rect x="48" y="14" width="14" height="12" rx="2" fill="#9e9e9e"/><path d="M66 16h12v8H66z" fill="#616161"/><rect x="48" y="40" width="20" height="16" fill="#f5c400"/></svg>',
	medkit: '<svg viewBox="0 0 120 90"><rect x="30" y="24" width="60" height="46" rx="4" fill="#f5f5f5"/><path d="M54 36h12v8h8v12h-8v8H54v-8h-8V44h8v-8z" fill="#d32f2f"/><rect x="46" y="18" width="28" height="8" rx="2" fill="#bdbdbd"/></svg>',
	matches: '<svg viewBox="0 0 120 90"><rect x="38" y="28" width="44" height="36" rx="2" fill="#ef6c00"/><rect x="38" y="28" width="44" height="10" fill="#5d4037"/><rect x="70" y="18" width="6" height="28" rx="2" fill="#f5e6c8"/><circle cx="73" cy="18" r="4" fill="#d32f2f"/></svg>',
};

export function prettyMoney(val: number | string) {
	return String(val).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

export function formatPrice(value: number | null | undefined) {
	const amount = value == null ? 0 : value;
	return '$' + prettyMoney(amount);
}

export function priceOf(prices: Record<string, number>, item: ShopItem) {
	const value = prices[item.priceKey];
	return value == null ? 0 : value;
}
