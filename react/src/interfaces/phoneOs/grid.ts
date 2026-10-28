import {
	bank,
	camera,
	car,
	clock,
	facetime,
	family,
	familyWidget,
	gallery,
	gas,
	health,
	messages,
	music,
	notes,
	phone,
	safari,
	settings,
	taxi,
	appstore,
	weather,
	maps,
	calc,
	calendar,
	news,
	radio,
	jobs,
	delivery,
} from './apps';

export const ICON = 44;
export const CELL_W = 62;
export const CELL_H = 75;
export const COLS = 4;
export const HOME_ROWS = 6;
export const ORIGIN_X = 24.5;
export const ORIGIN_Y = 56;
export const DOCK_Y = 536.5;
export const DOCK_ENTER = 520;
export const DOCK_LEAVE = 470;
export const PAGE_W = 279;
const LABEL = 16;

export type PieceKind = 'app' | 'card' | 'widget';

export interface Piece {
	key: string;
	id: string;
	name: string;
	icon: string;
	kind: PieceKind;
	spanX: number;
	spanY: number;
}

export interface Placement {
	key: string;
	col: number;
	row: number;
	page?: number;
}

export interface Slot {
	key: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface DragPos {
	key: string;
	x: number;
	y: number;
	zone: 'home' | 'dock';
	settle?: boolean;
}

const pieces: Piece[] = [
	{ key: 'family-card', id: 'family', name: 'Семья', icon: family, kind: 'card', spanX: 2, spanY: 2 },
	{ key: 'family-widget', id: 'family', name: 'Семья - это Мы', icon: familyWidget, kind: 'widget', spanX: 4, spanY: 2 },
	{ key: 'facetime', id: 'facetime', name: 'FaceTime', icon: facetime, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'gallery-top', id: 'gallery', name: 'Галерея', icon: gallery, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'camera', id: 'camera', name: 'Камера', icon: camera, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'settings', id: 'settings', name: 'Настройки', icon: settings, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'health', id: 'health', name: 'Здоровье', icon: health, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'notes', id: 'notes', name: 'Заметки', icon: notes, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'clock', id: 'clock', name: 'Время', icon: clock, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'gallery-row', id: 'gallery', name: 'Галерея', icon: gallery, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'bank', id: 'bank', name: 'Банк', icon: bank, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'taxi', id: 'taxi', name: 'Такси', icon: taxi, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'car', id: 'car', name: 'Машина', icon: car, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'gas', id: 'gas', name: 'АЗС', icon: gas, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'phone', id: 'phone', name: 'Телефон', icon: phone, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'safari', id: 'safari', name: 'Safari', icon: safari, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'messages', id: 'messages', name: 'Сообщения', icon: messages, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'music', id: 'music', name: 'Музыка', icon: music, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'appstore', id: 'appstore', name: 'App Store', icon: appstore, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'weather', id: 'weather', name: 'Погода', icon: weather, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'maps', id: 'maps', name: 'Карты', icon: maps, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'calc', id: 'calc', name: 'Калькулятор', icon: calc, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'calendar', id: 'calendar', name: 'Календарь', icon: calendar, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'news', id: 'news', name: 'Новости', icon: news, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'radio', id: 'radio', name: 'Радио', icon: radio, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'jobs', id: 'jobs', name: 'Работа', icon: jobs, kind: 'app', spanX: 1, spanY: 1 },
	{ key: 'delivery', id: 'delivery', name: 'Доставка', icon: delivery, kind: 'app', spanX: 1, spanY: 1 },
];

export const catalog: Record<string, Piece> = {};
pieces.forEach(function (piece) {
	catalog[piece.key] = piece;
});

export const initialHome: Placement[] = [
	{ key: 'family-card', col: 0, row: 0 },
	{ key: 'facetime', col: 2, row: 0 },
	{ key: 'gallery-top', col: 3, row: 0 },
	{ key: 'camera', col: 2, row: 1 },
	{ key: 'settings', col: 3, row: 1 },
	{ key: 'family-widget', col: 0, row: 2 },
	{ key: 'health', col: 0, row: 4 },
	{ key: 'notes', col: 1, row: 4 },
	{ key: 'clock', col: 2, row: 4 },
	{ key: 'gallery-row', col: 3, row: 4 },
	{ key: 'bank', col: 0, row: 5 },
	{ key: 'taxi', col: 1, row: 5 },
	{ key: 'car', col: 2, row: 5 },
	{ key: 'gas', col: 3, row: 5 },
	{ key: 'appstore', col: 0, row: 0, page: 1 },
];

export const initialDock: (string | null)[] = ['phone', 'safari', 'messages', 'music'];

interface Cell {
	col: number;
	row: number;
}

function metrics(piece: Piece) {
	if (piece.kind === 'app') {
		return { w: CELL_W, h: ICON + LABEL };
	}
	const w = (piece.spanX - 1) * CELL_W + ICON;
	const photo = (piece.spanY - 1) * CELL_H + ICON;
	if (piece.kind === 'widget') {
		return { w: w, h: photo };
	}
	return { w: w, h: photo + LABEL };
}

function footprint(col: number, row: number, spanX: number, spanY: number) {
	const cells: string[] = [];
	for (let y = 0; y < spanY; y += 1) {
		for (let x = 0; x < spanX; x += 1) {
			cells.push(col + x + ',' + (row + y));
		}
	}
	return cells;
}

function pageOf(place: Placement) {
	return place.page || 0;
}

function blocksOf(home: Placement[], page: number, except?: string) {
	return home.filter(function (place) {
		const piece = catalog[place.key];
		return place.key !== except && pageOf(place) === page && !!piece && piece.kind !== 'app';
	});
}

function overlaps(blocks: Placement[]) {
	const seen: Record<string, boolean> = {};
	for (let i = 0; i < blocks.length; i += 1) {
		const piece = catalog[blocks[i].key];
		const cells = footprint(blocks[i].col, blocks[i].row, piece.spanX, piece.spanY);
		for (let n = 0; n < cells.length; n += 1) {
			if (seen[cells[n]]) {
				return true;
			}
			seen[cells[n]] = true;
		}
	}
	return false;
}

function freeCells(blocks: Placement[]) {
	const taken: Record<string, boolean> = {};
	blocks.forEach(function (place) {
		const piece = catalog[place.key];
		footprint(place.col, place.row, piece.spanX, piece.spanY).forEach(function (cell) {
			taken[cell] = true;
		});
	});
	const cells: Cell[] = [];
	for (let row = 0; row < HOME_ROWS; row += 1) {
		for (let col = 0; col < COLS; col += 1) {
			if (!taken[col + ',' + row]) {
				cells.push({ col: col, row: row });
			}
		}
	}
	return cells;
}

function appsInOrder(home: Placement[], page: number) {
	return home
		.filter(function (place) {
			const piece = catalog[place.key];
			return !!piece && piece.kind === 'app' && pageOf(place) === page;
		})
		.slice()
		.sort(function (a, b) {
			return a.row - b.row || a.col - b.col;
		})
		.map(function (place) {
			return place.key;
		});
}

function stampPage(list: Placement[], page: number) {
	return list.map(function (place) {
		return { key: place.key, col: place.col, row: place.row, page: page };
	});
}

function replacePage(home: Placement[], page: number, next: Placement[]) {
	const rest = home.filter(function (place) {
		return pageOf(place) !== page;
	});
	return rest.concat(stampPage(next, page));
}

export function pageCount(home: Placement[]) {
	let max = 0;
	home.forEach(function (place) {
		if (pageOf(place) > max) {
			max = pageOf(place);
		}
	});
	return max + 1;
}

export function insertApp(home: Placement[], key: string) {
	const pages = pageCount(home);
	for (let page = 0; page < pages; page += 1) {
		const blocks = blocksOf(home, page);
		const cells = freeCells(blocks);
		const used: Record<string, boolean> = {};
		home.forEach(function (place) {
			if (pageOf(place) !== page) {
				return;
			}
			const piece = catalog[place.key];
			if (piece && piece.kind === 'app') {
				used[place.col + ',' + place.row] = true;
			}
		});
		const spot = cells.find(function (cell) {
			return !used[cell.col + ',' + cell.row];
		});
		if (!spot) {
			continue;
		}
		return home.concat({ key: key, col: spot.col, row: spot.row, page: page });
	}
	return home.concat({ key: key, col: 0, row: 0, page: pages });
}

function placeBlock(home: Placement[], key: string, page: number) {
	const piece = catalog[key];
	const blocks = blocksOf(home, page);
	for (let row = 0; row <= HOME_ROWS - piece.spanY; row += 1) {
		for (let col = 0; col <= COLS - piece.spanX; col += 1) {
			const trial = blocks.concat([{ key: key, col: col, row: row }]);
			if (overlaps(trial)) {
				continue;
			}
			const packed = reflow(trial, appsInOrder(home, page));
			if (packed) {
				return replacePage(home, page, packed);
			}
		}
	}
	return null;
}

export function moveToPage(home: Placement[], key: string, page: number) {
	const piece = catalog[key];
	const current = home.find(function (place) {
		return place.key === key;
	});
	if (!piece || !current || page < 0) {
		return null;
	}
	const from = pageOf(current);
	if (from === page) {
		return home;
	}
	const rest = home.filter(function (place) {
		return place.key !== key;
	});
	const fromLeft = reflow(blocksOf(rest, from), appsInOrder(rest, from));
	const without = fromLeft ? replacePage(rest, from, fromLeft) : rest;
	const fromEmpty = !without.some(function (place) {
		return pageOf(place) === from;
	});
	let target = page;
	if (fromEmpty && from < target) {
		target -= 1;
	}
	if (piece.kind !== 'app') {
		return placeBlock(without, key, target);
	}
	const blocks = blocksOf(without, target);
	const cells = freeCells(blocks);
	const order = appsInOrder(without, target);
	if (order.length >= cells.length) {
		return null;
	}
	order.push(key);
	return replacePage(without, target, assign(blocks, order, cells));
}

export function settlePages(home: Placement[], homePage: number) {
	const used: number[] = [];
	home.forEach(function (place) {
		const page = pageOf(place);
		if (used.indexOf(page) < 0) {
			used.push(page);
		}
	});
	used.sort(function (a, b) {
		return a - b;
	});
	const next = home.map(function (place) {
		const page = used.indexOf(pageOf(place));
		if (page === pageOf(place)) {
			return place;
		}
		return { key: place.key, col: place.col, row: place.row, page: page };
	});
	const mapped = used.indexOf(homePage);
	return {
		home: next,
		homePage: mapped < 0 ? Math.max(0, used.length - 1) : mapped,
	};
}

function assign(blocks: Placement[], apps: string[], cells: Cell[]) {
	const next: Placement[] = blocks.map(function (place) {
		return { key: place.key, col: place.col, row: place.row };
	});
	apps.forEach(function (key, index) {
		const cell = cells[index];
		if (!cell) {
			return;
		}
		next.push({ key: key, col: cell.col, row: cell.row });
	});
	return next;
}

function reflow(blocks: Placement[], apps: string[]) {
	const cells = freeCells(blocks);
	if (apps.length > cells.length) {
		return null;
	}
	return assign(blocks, apps, cells);
}

function cellDistance(cell: Cell, px: number, py: number) {
	const cx = ORIGIN_X + cell.col * CELL_W + ICON / 2;
	const cy = ORIGIN_Y + cell.row * CELL_H + ICON / 2;
	return Math.hypot(cx - px, cy - py);
}

function nearestIndex(cells: Cell[], px: number, py: number, current: number) {
	let best = current;
	let bestDist = Infinity;
	let currentDist = Infinity;
	cells.forEach(function (cell, index) {
		const dist = cellDistance(cell, px, py);
		if (index === current) {
			currentDist = dist;
		}
		if (dist < bestDist) {
			bestDist = dist;
			best = index;
		}
	});
	if (current < 0 || (best !== current && bestDist + 12 < currentDist)) {
		return best;
	}
	return current;
}

function relocate(order: string[], from: number, to: number) {
	if (from === to) {
		return order;
	}
	const next = order.slice();
	const key = next.splice(from, 1)[0];
	next.splice(to, 0, key);
	return next;
}

export function reorderApp(home: Placement[], key: string, px: number, py: number) {
	const current = home.find(function (place) {
		return place.key === key;
	});
	if (!current) {
		return home;
	}
	const page = pageOf(current);
	const blocks = blocksOf(home, page);
	const cells = freeCells(blocks);
	const order = appsInOrder(home, page);
	const from = order.indexOf(key);
	if (from < 0) {
		return home;
	}
	const to = nearestIndex(cells, px, py, from);
	if (to === from) {
		return home;
	}
	return replacePage(home, page, assign(blocks, relocate(order, from, to), cells));
}

export function moveBlock(home: Placement[], key: string, x: number, y: number) {
	const piece = catalog[key];
	const current = home.find(function (place) {
		return place.key === key;
	});
	if (!current || !piece) {
		return home;
	}
	const page = pageOf(current);
	const col = Math.max(0, Math.min(COLS - piece.spanX, Math.round((x - ORIGIN_X) / CELL_W)));
	const row = Math.max(0, Math.min(HOME_ROWS - piece.spanY, Math.round((y - ORIGIN_Y) / CELL_H)));
	if (current.col === col && current.row === row) {
		return home;
	}
	const blocks = blocksOf(home, page, key).concat([{ key: key, col: col, row: row }]);
	if (overlaps(blocks)) {
		return home;
	}
	const next = reflow(blocks, appsInOrder(home, page));
	if (!next) {
		return home;
	}
	return replacePage(home, page, next);
}

function dockIndex(px: number) {
	const index = Math.round((px - (ORIGIN_X + ICON / 2)) / CELL_W);
	if (index < 0) {
		return 0;
	}
	if (index > 3) {
		return 3;
	}
	return index;
}

export function compactDock(dock: (string | null)[]) {
	const items: string[] = [];
	dock.forEach(function (key) {
		if (key) {
			items.push(key);
		}
	});
	const already = items.every(function (key, index) {
		return dock[index] === key;
	});
	if (already) {
		return dock;
	}
	const next: (string | null)[] = items.slice();
	while (next.length < 4) {
		next.push(null);
	}
	return next;
}

export function shiftDock(dock: (string | null)[], key: string, px: number) {
	const from = dock.indexOf(key);
	const to = dockIndex(px);
	if (from < 0 || from === to) {
		return dock;
	}
	const next = dock.slice();
	next[from] = dock[to];
	next[to] = key;
	return next;
}

export interface Board {
	home: Placement[];
	dock: (string | null)[];
}

export function iconOrigin(key: string, slot: Slot, docked: boolean) {
	const piece = catalog[key];
	if (piece && piece.kind === 'app' && !docked) {
		return { x: slot.x + (CELL_W - ICON) / 2, y: slot.y };
	}
	return { x: slot.x, y: slot.y };
}

export function dragBoard(
	board: Board,
	key: string,
	x: number,
	y: number,
	px: number,
	py: number,
	zone: 'home' | 'dock',
	page = 0,
): Board {
	const piece = catalog[key];
	if (!piece) {
		return board;
	}
	if (piece.kind !== 'app') {
		const home = moveBlock(board.home, key, x, y);
		if (home === board.home) {
			return board;
		}
		return { home: home, dock: board.dock };
	}
	const fromDock = board.dock.indexOf(key);
	if (zone === 'dock') {
		if (fromDock >= 0) {
			const dock = shiftDock(board.dock, key, px);
			if (dock === board.dock) {
				return board;
			}
			return { home: board.home, dock: dock };
		}
		const owner = board.home.find(function (place) {
			return place.key === key;
		});
		const ownerPage = owner ? pageOf(owner) : 0;
		const to = dockIndex(px);
		const displaced = board.dock[to];
		const nextDock = board.dock.slice();
		nextDock[to] = key;
		const blocks = blocksOf(board.home, ownerPage);
		const cells = freeCells(blocks);
		const order = appsInOrder(board.home, ownerPage).filter(function (item) {
			return item !== key;
		});
		if (displaced && displaced !== key) {
			const oldIndex = appsInOrder(board.home, ownerPage).indexOf(key);
			order.splice(oldIndex < 0 ? order.length : oldIndex, 0, displaced);
		}
		const packed = reflow(blocks, order);
		if (!packed) {
			return board;
		}
		return { home: replacePage(board.home, ownerPage, packed), dock: nextDock };
	}
	if (fromDock >= 0) {
		const blocks = blocksOf(board.home, page);
		const cells = freeCells(blocks);
		const order = appsInOrder(board.home, page);
		if (order.length + 1 > cells.length) {
			const to = nearestIndex(cells, px, py, -1);
			const displaced = order[to];
			if (!displaced) {
				return board;
			}
			order[to] = key;
			const dock = board.dock.slice();
			dock[fromDock] = displaced;
			return { home: replacePage(board.home, page, assign(blocks, order, cells)), dock: dock };
		}
		const to = nearestIndex(cells, px, py, -1);
		order.splice(to, 0, key);
		const dock = board.dock.slice();
		dock[fromDock] = null;
		return { home: replacePage(board.home, page, assign(blocks, order, cells)), dock: dock };
	}
	const home = reorderApp(board.home, key, px, py);
	if (home === board.home) {
		return board;
	}
	return { home: home, dock: board.dock };
}

export function removePiece(board: Board, key: string): Board {
	if (board.dock.indexOf(key) >= 0) {
		const dock = board.dock.slice();
		dock[board.dock.indexOf(key)] = null;
		return { home: board.home, dock: compactDock(dock) };
	}
	const place = board.home.find(function (item) {
		return item.key === key;
	});
	if (!place) {
		return board;
	}
	const page = pageOf(place);
	const rest = board.home.filter(function (item) {
		return item.key !== key;
	});
	const packed = reflow(blocksOf(rest, page), appsInOrder(rest, page));
	return { home: packed ? replacePage(rest, page, packed) : rest, dock: board.dock };
}

function homeSlot(place: Placement): Slot {
	const piece = catalog[place.key];
	const size = metrics(piece);
	const iconX = ORIGIN_X + place.col * CELL_W;
	const y = ORIGIN_Y + place.row * CELL_H;
	const x = piece.kind === 'app' ? iconX - (CELL_W - ICON) / 2 : iconX;
	return { key: place.key, x: x, y: y, w: size.w, h: size.h };
}

const homeCache = new WeakMap<Placement[], Record<string, Slot>>();
const dockCache = new WeakMap<(string | null)[], Record<string, Slot>>();

export function readSlot(
	home: Placement[],
	dock: (string | null)[],
	drag: DragPos | null,
	key: string,
): Slot | null {
	if (drag && drag.key === key) {
		const piece = catalog[key];
		const size = !piece || piece.kind === 'app' ? { w: ICON, h: ICON } : metrics(piece);
		return { key: key, x: drag.x, y: drag.y, w: size.w, h: size.h };
	}
	let saved = homeCache.get(home);
	if (!saved) {
		saved = {};
		home.forEach(function (place) {
			saved![place.key] = homeSlot(place);
		});
		homeCache.set(home, saved);
	}
	if (saved[key]) {
		return saved[key];
	}
	let docked = dockCache.get(dock);
	if (!docked) {
		docked = {};
		dock.forEach(function (item, index) {
			if (!item) {
				return;
			}
			docked![item] = {
				key: item,
				x: ORIGIN_X + index * CELL_W,
				y: DOCK_Y,
				w: ICON,
				h: ICON,
			};
		});
		dockCache.set(dock, docked);
	}
	return docked[key] || null;
}

export function pointerCenter(key: string, x: number, y: number) {
	const piece = catalog[key];
	if (!piece || piece.kind === 'app') {
		return { x: x + ICON / 2, y: y + ICON / 2 };
	}
	const size = metrics(piece);
	return { x: x + size.w / 2, y: y + size.h / 2 };
}
