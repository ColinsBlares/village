import React from 'react';
import { urlItemImg } from './images';
import { notifyError, notifyInfo, triggerMp } from './mp';
import { createAccess, useInventoryStore } from './store';

let searchTimer: number | null = null;
let hotkeyUnbind: any = null;

function state() {
	return useInventoryStore.getState();
}

function vueSet(obj: any, key: any, value: any) {
	const Vue = (window as any).Vue;
	if (Vue && Vue.set) Vue.set(obj, key, value);
	else obj[key] = value;
}

function vueDelete(obj: any, key: any) {
	const Vue = (window as any).Vue;
	if (Vue && Vue.delete) Vue.delete(obj, key);
	else delete obj[key];
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function touchEquipment() {
	const equipment = state().equipment;
	useInventoryStore.setState({ equipment: Object.assign({}, equipment) });
}

export function touchEnvironment() {
	useInventoryStore.setState({ environment: state().environment.slice() });
}

function touchHotkeys() {
	useInventoryStore.setState({ hotkeysVersion: state().hotkeysVersion + 1 });
}

export function callRemote(eventName: string, values: any) {
	triggerMp('callRemote', eventName, JSON.stringify(values));
}

export function notify(message: string) {
	notifyInfo(message);
}

export function setShow(val: boolean) {
	const current = state();
	if (current.show === val) return;
	triggerMp('blur', val, 300);
	const hud = (window as any).hud;
	if (hud) hud.show = !val;
	const busy = (window as any).busy;
	if (val) {
		if (busy && busy.add) busy.add('inventory', true, true);
		triggerMp('radar.display', false);
		triggerMp('chat.opacity.set', 0);
	} else {
		if (busy && busy.remove) busy.remove('inventory', true);
		triggerMp('radar.display', true);
		triggerMp('chat.opacity.set', 1);
	}
	useInventoryStore.setState({ show: val, lastShowTime: Date.now() });
}

export function setEnable(val: boolean) {
	const next = !!val;
	if (state().enable === next) return;
	useInventoryStore.setState({ enable: next });
	if (!next) {
		setShow(false);
		const selectItems = (window as any).selectItems;
		if (selectItems) selectItems.show = false;
	}
}

export function indexToXY(rows: number, cols: number, index: any) {
	if (!rows || !cols) return null;
	const numeric = Number(index);
	const x = numeric % cols;
	const y = (numeric - x) / cols;
	if (x >= cols || y >= rows) return null;
	return { x: x, y: y };
}

export function xyToIndex(rows: number, cols: number, coord: { x: number; y: number }) {
	if (!rows || !cols) return -1;
	return coord.y * cols + coord.x;
}

export function getItemBySqlId(sqlId: any, items: any): any {
	if (!sqlId || sqlId == -1) return null;
	for (const index in items) {
		const item = items[index];
		if (!item) continue;
		if (item.sqlId == sqlId) return item;
		if (item.pockets) {
			for (const key in item.pockets) {
				const pocket = item.pockets[key];
				const found = getItemBySqlId(sqlId, pocket.items);
				if (found) return found;
			}
		}
	}
	return null;
}

export function getItem(sqlId: any) {
	return getItemBySqlId(sqlId, state().equipment);
}

export function getItemByParams(keys: any, values: any, items?: any): any {
	const source = items || state().equipment;
	const keyList = Array.isArray(keys) ? keys : [keys];
	const valueList = Array.isArray(values) ? values : [values];
	for (const index in source) {
		const item = source[index];
		if (!item) continue;
		const params = item.params || {};
		let isFind = true;
		for (let i = 0; i < keyList.length; i++) {
			const param = params[keyList[i]];
			if (!param) {
				isFind = false;
				break;
			}
			if (param && param != valueList[i]) {
				isFind = false;
				break;
			}
		}
		if (isFind) return item;
		if (item.pockets) {
			for (const key in item.pockets) {
				const found = getItemByParams(keyList, valueList, item.pockets[key].items);
				if (found) return found;
			}
		}
	}
	return null;
}

export function getItemsByItemId(itemId: any, items?: any, list?: any[]) {
	const source = items || state().equipment;
	const result = list || [];
	for (const index in source) {
		const item = source[index];
		if (!item) continue;
		if (item.itemId == itemId) result.push(item);
		if (item.pockets) {
			for (const key in item.pockets) {
				getItemsByItemId(itemId, item.pockets[key].items, result);
			}
		}
	}
	return result;
}

export function getAmmoItemId(itemId: any) {
	const mergeList = state().mergeList;
	for (const ammoId in mergeList) {
		const list = mergeList[ammoId];
		if (list && list.indexOf(itemId) !== -1) return parseInt(ammoId, 10);
	}
	return null;
}

export function getItemWeight(items: any, weight?: number) {
	let total = weight == null ? 0 : weight;
	const list = Array.isArray(items) ? items : [items];
	const infoMap = state().itemsInfo;
	for (const index in list) {
		const item = list[index];
		if (!item || item.search) continue;
		const info = infoMap[item.itemId];
		if (!info) continue;
		total += info.weight;
		if (item.params && item.params.weight) total += item.params.weight;
		if (item.params && item.params.count) total += (item.params.count - 1) * info.weight;
		if (item.params && item.params.litres) total += item.params.litres;
		if (item.params && item.params.weaponHash && item.params.ammo) {
			const ammoId = getAmmoItemId(item.itemId);
			if (ammoId && infoMap[ammoId]) total += infoMap[ammoId].weight * item.params.ammo;
		}
		if (item.pockets) {
			for (const key in item.pockets) {
				total += getItemWeight(Object.keys(item.pockets[key].items).map(function (itemIndex) {
					return item.pockets[key].items[itemIndex];
				}), 0);
			}
		}
	}
	return +total.toFixed(3);
}

export function getCommonWeight() {
	const equipment = state().equipment;
	const list = [];
	for (const key in equipment) list.push(equipment[key]);
	return getItemWeight(list);
}

export function getPlaceWeight(place: any) {
	let weight = 0;
	if (!place || !place.pockets) return 0;
	for (const i in place.pockets) {
		const pocket = place.pockets[i];
		const values = [];
		for (const index in pocket.items) values.push(pocket.items[index]);
		weight += getItemWeight(values);
	}
	return +weight.toFixed(3);
}

export function getItemName(item: any) {
	if (!item) return null;
	const info = state().itemsInfo[item.itemId];
	if (item.pockets && item.pockets.findIndex(function (pocket: any) {
		if (pocket.search) return true;
		const values = [];
		for (const key in pocket.items) values.push(pocket.items[key]);
		return values.findIndex(function (child: any) {
			return child && child.search;
		}) !== -1;
	}) !== -1) return 'Обыск...';
	if ([6, 7, 8, 9, 15, 133, 134].indexOf(item.itemId) !== -1 && item.params && item.params.name) return '' + item.params.name;
	if (item.itemId == 16 && item.params && item.params.name && info) return info.name + ' ' + item.params.name;
	if (item.itemId == 33 && item.params && item.params.vehName) return 'Ключи от ' + item.params.vehName;
	if (item.itemId == 131 && item.params && item.params.name) return '' + item.params.name;
	if (!info) return '';
	return info.name;
}

export function getPrettyParams(itemId: any, params: any) {
	const info = state().itemsInfo[itemId];
	if (!info) return [];
	const safeParams = params || {};
	const result: Array<{ name: string; value: string }> = [
		{ name: 'Занимает', value: info.width + 'x' + info.height + ' ячейки' },
		{ name: 'Обнаружение', value: info.chance + '%' },
	];
	if (safeParams.health != null) result.push({ name: 'Прочность', value: +Number(safeParams.health).toFixed(2) + '%' });
	if (safeParams.count) result.push({ name: 'Количество', value: safeParams.count + ' ед.' });
	if (safeParams.clime) result.push({ name: 'Климат', value: 'от ' + safeParams.clime[0] + '° до ' + safeParams.clime[1] + '°' });
	if (safeParams.satiety) result.push({ name: 'Сытость', value: safeParams.satiety + '%' });
	if (safeParams.thirst) result.push({ name: 'Жажда', value: safeParams.thirst + '%' });
	if (safeParams.weaponHash) {
		const ammoId = getAmmoItemId(itemId);
		if (ammoId && state().itemsInfo[ammoId]) result.push({ name: 'Калибр', value: state().itemsInfo[ammoId].name });
	}
	if (safeParams.ammo != null) result.push({ name: 'Патроны', value: safeParams.ammo + ' ед.' });
	if (safeParams.owner) result.push({ name: 'Владелец', value: '#' + safeParams.owner });
	if (safeParams.faction) result.push({ name: 'Организация', value: '#' + safeParams.faction });
	if (safeParams.litres != null) result.push({ name: 'Топливо', value: safeParams.litres + ' л.' });
	if (safeParams.max) result.push({ name: 'Вместимость', value: safeParams.max + ' л.' });
	if (safeParams.treeDamage) result.push({ name: 'Урон по дереву', value: safeParams.treeDamage + '%' });
	if (safeParams.alcohol) result.push({ name: 'Алкоголь', value: safeParams.alcohol + '%' });
	if (safeParams.sex != null) result.push({ name: 'Пол', value: safeParams.sex ? 'Мужской' : 'Женский' });
	return result;
}

export function getDescParams(item: any) {
	if (!item) return [];
	const params = [{ name: 'Вес', value: (parseInt(String(getItemWeight(item) * 1000), 10) / 1000) + ' кг' }];
	if (item.pockets) {
		params.push({
			name: 'Карманы',
			value: item.pockets.filter(function (pocket: any) {
				return !pocket.search;
			}).length + ' ед.',
		});
		params.push({ name: 'Содержит', value: getItemsCount(item) + ' предметов' });
	}
	return params.concat(getPrettyParams(item.itemId, item.params));
}

export function getItemsCount(item: any) {
	if (!item || !item.pockets) return 0;
	let count = 0;
	item.pockets.forEach(function (pocket: any) {
		if (pocket.search) return;
		for (const index in pocket.items) {
			if (pocket.items[index].search) continue;
			count++;
		}
	});
	return count;
}

export function valueColor(value: number) {
	if (value > 50) return '#6AC93D88';
	if (value > 15) return '#C9783D88';
	return '#C93D3D88';
}

export function itemGradient(item: any, transparent?: boolean) {
	if (item && item.params && item.params.health && !item.search) {
		const alpha = transparent ? 0 : 0.3;
		return 'linear-gradient(0deg, ' + valueColor(item.params.health) + ' ' + item.params.health + '%, rgba(255,255,255,' + alpha + ') ' + item.params.health + '%)';
	}
	return '';
}

export function itemStyle(item: any) {
	const current = state();
	const info = current.itemsInfo[item.itemId];
	const dragging = current.dragItem && current.dragItem.sqlId == item.sqlId;
	const url = urlItemImg(item.itemId);
	if (!info) {
		return {
			backgroundImage: 'url(' + url + ')',
			width: '2.45vh',
			height: '2.45vh',
			pointerEvents: current.dragItem ? 'none' : '',
		};
	}
	const style: any = {
		backgroundImage: 'url(' + url + ')',
		height: 'calc(' + info.height * 2.45 + 'vh + ' + (info.height - 1) + 'px)',
		width: 'calc(' + info.width * 2.45 + 'vh + ' + (info.width - 1) + 'px)',
		pointerEvents: current.dragItem ? 'none' : '',
	};
	if (item.params && item.params.health && !dragging && !item.found) {
		style.backgroundImage = 'url(' + url + '), ' + itemGradient(item);
		style.backgroundColor = '#fff0';
	}
	return style;
}

export function blackListExists(parentId: any, childId: any) {
	const list = state().blackList[parentId];
	if (!list) return false;
	return list.indexOf(childId) !== -1;
}

export function genMatrix(item: any, pocketIndex: number) {
	if (!item.pockets) return null;
	const matrix: number[][] = [];
	const cols = item.pockets[pocketIndex].cols;
	const rows = item.pockets[pocketIndex].rows;
	for (let i = 0; i < rows; i++) {
		matrix[i] = [];
		for (let j = 0; j < cols; j++) matrix[i][j] = 0;
	}
	const children = item.pockets[pocketIndex].items;
	for (const index in children) {
		const child = children[index];
		const coord = indexToXY(rows, cols, index);
		if (!coord) continue;
		const info = state().itemsInfo[child.itemId];
		if (!info) continue;
		for (let x = 0; x < info.width; x++) {
			for (let y = 0; y < info.height; y++) {
				if (matrix[coord.y + y] && matrix[coord.y + y][coord.x + x] != null) matrix[coord.y + y][coord.x + x] = 1;
			}
		}
	}
	return matrix;
}

export function findFreeIndexMatrix(matrix: number[][], itemId: any) {
	const info = state().itemsInfo[itemId];
	if (!info || !matrix || !matrix.length) return -1;
	const w = info.width;
	const h = info.height;
	for (let i = 0; i < matrix.length - h + 1; i++) {
		for (let j = 0; j < matrix[i].length - w + 1; j++) {
			let doBreak = false;
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					if (matrix[i + y][j + x] == 1) {
						doBreak = true;
						break;
					}
				}
				if (doBreak) break;
			}
			if (!doBreak) return xyToIndex(matrix.length, matrix[0].length, { x: j, y: i });
		}
	}
	return -1;
}

export function findFreeSlot(itemId: any) {
	const current = state();
	for (const bodyIndex in current.bodyList) {
		const index = parseInt(bodyIndex, 10);
		const list = current.bodyList[bodyIndex];
		if (!list) continue;
		if (list.indexOf(itemId) !== -1 && !current.equipment[index]) {
			return { pocketIndex: null, index: index, parentId: null };
		}
	}
	for (const index in current.equipment) {
		const item = current.equipment[index];
		if (!item || !item.pockets) continue;
		if (item.itemId == itemId) continue;
		if (blackListExists(item.itemId, itemId)) continue;
		for (let pocketI = 0; pocketI < item.pockets.length; pocketI++) {
			const matrix = genMatrix(item, pocketI);
			if (!matrix) continue;
			const freeIndex = findFreeIndexMatrix(matrix, itemId);
			if (freeIndex == -1) continue;
			return { pocketIndex: pocketI, index: freeIndex, parentId: item.sqlId };
		}
	}
	return null;
}

export function deleteItem(sqlId: any, items?: any, quiet?: boolean) {
	const target = items || state().equipment;
	const top = !items;
	for (const index in target) {
		const item = target[index];
		if (!item) continue;
		if (item.sqlId == sqlId) vueDelete(target, index);
		if (item.pockets) {
			for (const key in item.pockets) deleteItem(sqlId, item.pockets[key].items, true);
		}
	}
	if (top && !quiet) touchEquipment();
}

export function getEnvironmentPlace(sqlId: any) {
	const places = state().environment;
	for (const i in places) {
		if (places[i].sqlId == sqlId) return places[i];
	}
	return null;
}

export function getEnvironmentItem(sqlId: any) {
	const places = state().environment;
	for (const i in places) {
		const place = places[i];
		for (const j in place.pockets) {
			const item = getItemBySqlId(sqlId, place.pockets[j].items);
			if (item) return item;
		}
	}
	return null;
}

export function deleteEnvironmentItem(sqlId: any, quiet?: boolean) {
	const places = state().environment;
	for (const i in places) {
		const place = places[i];
		for (const j in place.pockets) {
			const items = place.pockets[j].items;
			for (const index in items) {
				const item = items[index];
				if (!item) continue;
				if (item.sqlId == sqlId) vueDelete(items, index);
				if (item.pockets) {
					for (const key in item.pockets) deleteItem(sqlId, item.pockets[key].items, true);
				}
			}
		}
	}
	if (!quiet) touchEnvironment();
}

export function addItem(item: any, pocket: any, index: any, parent?: any) {
	if (typeof item === 'number') item = getItem(item);
	if (typeof parent === 'number') parent = getItem(parent);
	if (typeof item === 'string') item = JSON.parse(item);
	if (typeof parent === 'string') parent = JSON.parse(parent);
	if (!item) return;
	deleteItem(item.sqlId, undefined, true);
	deleteEnvironmentItem(item.sqlId, true);
	if (item.pockets) vueSet(item, 'showPockets', true);
	if (parent) vueSet(parent.pockets[pocket].items, index, item);
	else vueSet(state().equipment, index, item);
	touchEquipment();
	touchEnvironment();
}

export function initItems(items: any) {
	if (typeof items === 'string') items = JSON.parse(items);
	for (const index in items) addItem(items[index], null, index);
}

export function addEnvironmentItem(item: any, pocket: any, index: any, placeSqlId: any) {
	deleteEnvironmentItem(item.sqlId, true);
	deleteItem(item.sqlId, undefined, true);
	const place = getEnvironmentPlace(placeSqlId);
	if (!place) {
		notify('addEnvironmentItem: место с sqlId ' + placeSqlId + ' не найдено');
		touchEquipment();
		touchEnvironment();
		return;
	}
	vueSet(place.pockets[pocket].items, index, item);
	touchEquipment();
	touchEnvironment();
}

export function addEnvironmentPlace(place: any) {
	if (typeof place === 'string') place = JSON.parse(place);
	vueSet(place, 'showPockets', true);
	const environment = state().environment.slice();
	environment.unshift(place);
	useInventoryStore.setState({ environment: environment });
}

export function deleteEnvironmentPlace(sqlId: any) {
	const environment = state().environment.slice();
	for (let i = environment.length - 1; i >= 0; i--) {
		if (environment[i].sqlId == sqlId) environment.splice(i, 1);
	}
	useInventoryStore.setState({ environment: environment });
}

export function setWaitItem(item: any, enable: boolean) {
	useInventoryStore.setState({ controlEnable: !enable });
	vueSet(item, 'wait', enable);
	touchEquipment();
	touchEnvironment();
}

export function setFoundItem(item: any, enable: any) {
	if (typeof item === 'number') item = getItem(item);
	if (!item) return;
	vueSet(item, 'found', enable);
	touchEquipment();
	touchEnvironment();
	if (enable) {
		const wait = state().foundTime;
		window.setTimeout(function () {
			vueSet(item, 'found', !enable);
			touchEquipment();
			touchEnvironment();
		}, wait);
	}
}

export function setItemSqlId(item: any, sqlId: any) {
	if (typeof item === 'number') item = getItem(item);
	if (!item) return notify('setItemSqlId: Предмет ' + item + ' не найден');
	vueSet(item, 'sqlId', parseInt(sqlId, 10));
	setWaitItem(item, false);
}

export function setItemParam(item: any, key: any, value: any) {
	if (typeof item === 'number') item = getItem(item);
	if (!item) return;
	let next = value;
	if (!isNaN(next)) next = parseFloat(next);
	if (!item.params) item.params = {};
	vueSet(item.params, key, next);
	touchEquipment();
	touchHotkeys();
}

export function setEnvironmentItemSqlId(item: any, sqlId: any) {
	if (typeof item === 'number') item = getEnvironmentItem(item);
	if (!item) return notify('setEnvironmentItemParam: Предмет ' + item + ' не найден');
	vueSet(item, 'sqlId', parseInt(sqlId, 10));
	setWaitItem(item, false);
}

export function setEnvironmentItemParam(item: any, key: any, value: any) {
	if (typeof item === 'number') item = getEnvironmentItem(item);
	if (!item) return notify('setEnvironmentItemParam: Предмет ' + item + ' не найден');
	let next = value;
	if (!isNaN(next)) next = parseFloat(next);
	if (!item.params) item.params = {};
	vueSet(item.params, key, next);
	touchEnvironment();
}

export function setArmour(value: any) {
	const item = state().equipment[4];
	if (!item || !item.params) return;
	item.params.health = value;
	touchEquipment();
}

export function setAmmo(weaponHash: any, ammo: any) {
	const hash = parseInt(weaponHash, 10);
	const item = getItemByParams('weaponHash', hash);
	if (!item) return;
	const current = state();
	if (current.weaponsList.indexOf(item.itemId) !== -1) setItemParam(item, 'ammo', ammo);
	else if (current.throwableWeaponsList.indexOf(item.itemId) !== -1) {
		setItemParam(item, 'ammo', ammo);
		if (ammo <= 0) {
			deleteItem(item.sqlId);
			callRemote('inventory.throwableWeapon.delete', item.sqlId);
		}
	}
}

export function putGroundHandler(item: any) {
	triggerMp('inventory.ground.put', item.sqlId);
}

export function moveItemToBody(item: any, bodyIndex: any) {
	if (!item) return;
	const oldItem = state().equipment[bodyIndex];
	let canAdd = true;
	if (oldItem && oldItem != item) {
		const freeSlot = findFreeSlot(oldItem.itemId);
		if (!freeSlot) {
			notify('Нет места для ' + getItemName(oldItem));
			canAdd = false;
		} else {
			addItem(oldItem, freeSlot.pocketIndex, freeSlot.index, freeSlot.parentId);
			callRemote('item.add', {
				sqlId: oldItem.sqlId,
				pocketI: freeSlot.pocketIndex,
				index: freeSlot.index,
				placeSqlId: freeSlot.parentId,
			});
		}
	}
	if (!canAdd) return;
	if (!getItem(item.sqlId)) setWaitItem(item, true);
	addItem(item, null, bodyIndex);
	callRemote('item.add', {
		sqlId: item.sqlId,
		pocketI: null,
		index: parseInt(bodyIndex, 10),
		placeSqlId: null,
	});
}

export function clearHands() {
	const item = state().equipment[13];
	if (!item) return;
	const freeSlot = findFreeSlot(item.itemId);
	if (!freeSlot) putGroundHandler(item);
	else {
		addItem(item, freeSlot.pocketIndex, freeSlot.index, freeSlot.parentId);
		callRemote('item.add', {
			sqlId: item.sqlId,
			pocketI: freeSlot.pocketIndex,
			index: freeSlot.index,
			placeSqlId: freeSlot.parentId,
		});
		notify('Предмет спрятан');
	}
}

export function bindHotkey(itemSqlId: any, key: any) {
	const item = getItem(itemSqlId);
	if (!item) {
		unbindHotkey(key);
		return;
	}
	clearHotkeys(item);
	vueSet(state().hotkeys, key, item);
	touchHotkeys();
	triggerMp('inventory.saveHotkey', itemSqlId, key);
}

export function unbindHotkey(key: any) {
	triggerMp('inventory.removeHotkey', key);
	vueDelete(state().hotkeys, key);
	touchHotkeys();
}

export function clearHotkeys(item: any) {
	let target = item;
	if (typeof target === 'number') target = getItem(target);
	if (!target) return;
	const hotkeys = state().hotkeys;
	const keys = [];
	for (const key in hotkeys) keys.push(key);
	for (let i = 0; i < keys.length; i++) {
		const it = hotkeys[keys[i]];
		if (it && it.sqlId == target.sqlId) unbindHotkey(keys[i]);
	}
}

export function onUseHotkey(key: any) {
	const current = state();
	if (!current.enable || !current.controlEnable || current.handsBlock) return;
	if (Date.now() - current.lastUseHotkey < current.waitUseHotkey) return;
	const item = current.hotkeys[key];
	if (!item || !getItem(item.sqlId)) return;
	if (item == current.equipment[13]) return;
	useInventoryStore.setState({ lastUseHotkey: Date.now() });
	moveItemToBody(item, 13);
}

export function onUseHandsItem() {
	const current = state();
	if (!current.enable || !current.controlEnable) return;
	const item = current.equipment[13];
	if (!item) return;
	const hotkey = current.hotkeysList[item.itemId];
	if (!hotkey || !hotkey.handler) return;
	hotkey.handler(item);
}

function eatHandler(item: any) {
	const current = state();
	if (current.equipment[13] != item) return notifyError('Еда не в руках', getItemName(item));
	const diff = Date.now() - current.lastUseEat;
	const wait = current.eatWaitTime;
	if (diff < wait) return notifyError('Повторная трапеза доступно через ' + parseInt(String((wait - diff) / 1000), 10) + ' сек.', getItemName(item));
	useInventoryStore.setState({ lastUseEat: Date.now() });
	triggerMp('inventory.setHandsBlock', true, true);
	deleteItem(item.sqlId);
	triggerMp('callRemote', 'inventory.item.eat.use', item.sqlId);
}

function drinkHandler(item: any) {
	const current = state();
	if (current.equipment[13] != item) return notifyError('Напиток не в руках', getItemName(item));
	const diff = Date.now() - current.lastUseDrink;
	const wait = current.drinkWaitTime;
	if (diff < wait) return notifyError('Повторное выпивание доступно через ' + parseInt(String((wait - diff) / 1000), 10) + ' сек.', getItemName(item));
	useInventoryStore.setState({ lastUseDrink: Date.now() });
	triggerMp('inventory.setHandsBlock', true, true);
	deleteItem(item.sqlId);
	triggerMp('callRemote', 'inventory.item.drink.use', item.sqlId);
}

export function setItemsInfo(itemsInfo: any) {
	if (typeof itemsInfo === 'string') itemsInfo = JSON.parse(itemsInfo);
	const current = state();
	const nextInfo = Object.assign({}, current.itemsInfo);
	const nextMenu = Object.assign({}, current.itemsMenu);
	const nextHotkeys = Object.assign({}, current.hotkeysList);
	for (const rawId in itemsInfo) {
		const itemId = parseInt(rawId, 10);
		nextInfo[itemId] = itemsInfo[rawId];
		if (!nextMenu[itemId]) nextMenu[itemId] = {};
		const menu = nextMenu[itemId];
		if (current.weaponsList.indexOf(itemId) !== -1) {
			menu['Зарядить'] = {
				handler: function (item: any) {
					triggerMp('callRemote', 'weapons.weapon.ammo.fill', item.sqlId);
				},
			};
			menu['Разрядить'] = {
				handler: function (item: any) {
					const hash = item.params.weaponHash;
					triggerMp('weapons.ammo.remove', item.sqlId, hash.toString());
				},
			};
		} else if (current.eatList.indexOf(itemId) !== -1) {
			menu['Съесть'] = { handler: eatHandler };
			nextHotkeys[itemId] = { handler: eatHandler };
		} else if (current.drinkList.indexOf(itemId) !== -1) {
			menu['Выпить'] = { handler: drinkHandler };
			nextHotkeys[itemId] = { handler: drinkHandler };
		}
		menu['Выкинуть'] = { handler: putGroundHandler };
	}
	useInventoryStore.setState({ itemsInfo: nextInfo, itemsMenu: nextMenu, hotkeysList: nextHotkeys });
}

export function setItemInfo(itemId: any, info: any) {
	let next = info;
	if (typeof next === 'string') next = JSON.parse(next);
	const itemsInfo = Object.assign({}, state().itemsInfo);
	itemsInfo[itemId] = next;
	useInventoryStore.setState({ itemsInfo: itemsInfo });
}

export function setMergeList(list: any) {
	let next = list;
	if (typeof next === 'string') next = JSON.parse(next);
	useInventoryStore.setState({ mergeList: next });
}

export function setBlackList(list: any) {
	let next = list;
	if (typeof next === 'string') next = JSON.parse(next);
	useInventoryStore.setState({ blackList: next });
}

export function setBodyList(index: any, list: any) {
	let next = list;
	if (typeof next === 'string') next = JSON.parse(next);
	const bodyList = Object.assign({}, state().bodyList);
	bodyList[index] = next;
	useInventoryStore.setState({ bodyList: bodyList });
}

export function getItemInfoHash(itemId: any) {
	const info = state().itemsInfo[itemId];
	return info.name.length + info.description.length + info.height + info.width + info.weight * 1000;
}

export function getItemsInfoHashes(chunk?: number) {
	const size = chunk == null ? 2 : chunk;
	const hashes = [];
	const itemsInfo = state().itemsInfo;
	for (const itemId in itemsInfo) hashes.push(getItemInfoHash(itemId));
	for (let i = 0; i < hashes.length; i++) {
		for (let j = 1; j < size; j++) {
			if (!hashes[i + j]) break;
			hashes[i] += hashes[i + j];
		}
		hashes.splice(i + 1, size - 1);
	}
	return hashes;
}

function restoreSearchEquipment(oldMode: any) {
	const equipment = state().equipment;
	const ids = [];
	for (const index in equipment) {
		if (equipment[index]) ids.push(equipment[index].sqlId);
	}
	for (let i = 0; i < ids.length; i++) deleteItem(ids[i]);
	initItems(oldMode.myEquipment);
	if (searchTimer != null) {
		clearInterval(searchTimer);
		searchTimer = null;
	}
}

export function setSearchMode(val: any) {
	const old = state().searchMode;
	useInventoryStore.setState({ searchMode: val });
	if (old && !val) restoreSearchEquipment(old);
}

export function setSearchItems(items: any[], enable: boolean) {
	const list: any[] = [];
	items.forEach(function (item) {
		vueSet(item, 'search', enable);
		list.push(item);
		if (item.pockets) {
			item.pockets.forEach(function (pocket: any) {
				vueSet(pocket, 'search', enable);
				list.push(pocket);
				for (const index in pocket.items) {
					const child = pocket.items[index];
					vueSet(child, 'search', enable);
					list.push(child);
				}
			});
		}
	});
	if (searchTimer != null) {
		clearInterval(searchTimer);
		searchTimer = null;
	}
	useInventoryStore.setState({ searchList: list });
	touchEquipment();
	if (!enable) return;
	searchTimer = window.setInterval(function () {
		const current = state().searchList.slice();
		const el = current.shift();
		useInventoryStore.setState({ searchList: current });
		if (!el || !state().searchMode) {
			if (searchTimer != null) clearInterval(searchTimer);
			searchTimer = null;
			return;
		}
		vueSet(el, 'search', false);
		touchEquipment();
		if (el.itemId) callRemote('police.inventory.search.found', { sqlId: el.sqlId, itemId: el.itemId });
	}, state().searchWait);
}

export function initSearchItems(data: any) {
	if (state().searchMode) return notify('Режим обыска уже активирован');
	if (!state().enable) return notify('Инвентарь не доступен');
	if (typeof data === 'string') data = JSON.parse(data);
	const myEquipment = Object.assign({}, state().equipment);
	const ids = [];
	for (const index in state().equipment) {
		if (state().equipment[index]) ids.push(state().equipment[index].sqlId);
	}
	for (let i = 0; i < ids.length; i++) deleteItem(ids[i]);
	useInventoryStore.setState({
		searchMode: {
			playerId: data.playerId,
			playerName: data.playerName,
			myEquipment: myEquipment,
		},
	});
	const values = [];
	for (const index in data.items) values.push(data.items[index]);
	setSearchItems(values, true);
	for (const index in data.items) addItem(data.items[index], null, index);
	setShow(true);
}

export function stopSearchMode() {
	if (!state().searchMode) return notify('Режим обыска не активирован');
	setSearchMode(null);
}

export function toggleShowPockets(place: any) {
	place.showPockets = !place.showPockets;
	touchEquipment();
	touchEnvironment();
}

export function getItemsMenu(itemId: any) {
	const current = state();
	if (!current.searchMode) return current.itemsMenu[itemId];
	return {
		'Выкинуть': {
			handler: function (item: any) {
				deleteItem(item.sqlId);
				triggerMp('police.inventory.search.item.putGround', item.sqlId);
			},
		},
	};
}

function equipmentBusyColumns() {
	const cols: any = {};
	const current = state();
	for (const i in current.equipment) {
		const equip = current.equipment[i];
		if (!equip || !equip.pockets) continue;
		cols[equip.sqlId] = {};
		for (const j in equip.pockets) {
			const pocket = equip.pockets[j];
			const keys = [];
			for (const itemIndex in pocket.items) keys.push(itemIndex);
			if (!keys.length) continue;
			cols[equip.sqlId][j] = {};
			for (const itemIndex in pocket.items) {
				const item = pocket.items[itemIndex];
				const info = current.itemsInfo[item.itemId];
				if (!info) continue;
				const coord = indexToXY(pocket.rows, pocket.cols, itemIndex);
				if (!coord) continue;
				for (let x = 0; x < info.width; x++) {
					for (let y = 0; y < info.height; y++) {
						const cell = xyToIndex(pocket.rows, pocket.cols, { x: coord.x + x, y: coord.y + y });
						cols[equip.sqlId][j][cell] = item.sqlId;
					}
				}
			}
		}
	}
	return cols;
}

function environmentBusyColumns() {
	const cols: any = {};
	const current = state();
	for (const i in current.environment) {
		const env = current.environment[i];
		cols[env.sqlId] = {};
		for (const j in env.pockets) {
			const pocket = env.pockets[j];
			cols[env.sqlId][j] = {};
			for (const itemIndex in pocket.items) {
				const item = pocket.items[itemIndex];
				const info = current.itemsInfo[item.itemId];
				if (!info) continue;
				const coord = indexToXY(pocket.rows, pocket.cols, itemIndex);
				if (!coord) continue;
				for (let x = 0; x < info.width; x++) {
					for (let y = 0; y < info.height; y++) {
						const cell = xyToIndex(pocket.rows, pocket.cols, { x: coord.x + x, y: coord.y + y });
						cols[env.sqlId][j][cell] = item.sqlId;
					}
				}
			}
		}
	}
	return cols;
}

export function isColumnBusy(place: any, pocketI: any, index: any, item: any, cols?: any) {
	const map = cols || (place.sqlId > 0 ? equipmentBusyColumns() : environmentBusyColumns());
	if (!map[place.sqlId] || !map[place.sqlId][pocketI]) return false;
	if (!map[place.sqlId][pocketI][index]) return false;
	return map[place.sqlId][pocketI][index] != item.sqlId;
}

export function getItemInColumn(place: any, pocketI: any, index: any, cols?: any) {
	const map = cols || (place.sqlId > 0 ? equipmentBusyColumns() : environmentBusyColumns());
	if (!map[place.sqlId] || !map[place.sqlId][pocketI] || !map[place.sqlId][pocketI][index]) return null;
	const sqlId = map[place.sqlId][pocketI][index];
	return place.sqlId > 0 ? getItem(sqlId) : getEnvironmentItem(sqlId);
}

export function isColumnAccess(index: any, pocket: any, place: any) {
	const current = state();
	if (!current.dragItem || !place || !place.pockets) return false;
	const access = current.access;
	if (access.placeSqlId != place.sqlId) return false;
	const pocketI = place.pockets.indexOf(pocket);
	if (pocketI == -1 || access.pocketI != pocketI) return false;
	if (!access.columns[index]) return false;
	return true;
}

function inventoryRect() {
	const root = document.getElementById('inventory');
	if (!root) return null;
	return root.getBoundingClientRect();
}

function placeDesc(item: any, e: MouseEvent) {
	const rect = inventoryRect();
	if (!rect) return;
	const descEl = document.getElementsByClassName('inv-item-desc')[0] as HTMLElement;
	const descRect = descEl ? descEl.getBoundingClientRect() : null;
	let x = e.screenX + 15;
	let y = e.screenY + 15;
	if (descRect && x + descRect.width > window.innerWidth) x = window.innerWidth - descRect.width;
	if (descRect && y + descRect.height > window.innerHeight) y = window.innerHeight - descRect.height;
	useInventoryStore.setState({
		itemDesc: { item: item, x: x - rect.left, y: y - rect.top },
	});
}

export function onItemMouseEnter(item: any, e: React.MouseEvent<HTMLDivElement>) {
	placeDesc(item, e.nativeEvent);
}

export function onItemMouseMove(item: any, e: React.MouseEvent<HTMLDivElement>) {
	placeDesc(item, e.nativeEvent);
}

export function onItemMouseLeave() {
	useInventoryStore.setState({ itemDesc: { item: null, x: 0, y: 0 } });
}

export function onItemContextMenu(item: any, e: React.MouseEvent<HTMLDivElement>) {
	e.preventDefault();
	const current = state();
	if (current.searchMode && current.takeSearchList.indexOf(item.itemId) === -1) return;
	if (!current.controlEnable) return;
	const rect = inventoryRect();
	if (!rect) return;
	useInventoryStore.setState({
		itemMenu: {
			item: item,
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		},
	});
}

export function onItemMouseDown(item: any, e: React.MouseEvent<HTMLDivElement>) {
	if (e.button !== 0) return;
	const current = state();
	if (item.wait) return;
	if (current.searchMode) return;
	if (!current.controlEnable) return;
	const rect = inventoryRect();
	if (!rect) return;
	hotkeyUnbind = null;
	if (current.hotkeyFocus && current.hotkeys[current.hotkeyFocus] == item) hotkeyUnbind = current.hotkeyFocus;
	useInventoryStore.setState({
		dragItem: item,
		dragX: e.screenX - rect.left,
		dragY: e.screenY - rect.top,
	});
}

export function onBodyItemEnter(index: number) {
	const current = state();
	if (!current.dragItem) return;
	const list = current.bodyList[index];
	if (list && list.indexOf(current.dragItem.itemId) === -1) return;
	const info = current.itemsInfo[current.dragItem.itemId];
	if (!info) return;
	const nextWeight = getCommonWeight() + info.weight;
	if (nextWeight > current.maxPlayerWeight && !getItem(current.dragItem.sqlId)) return;
	if (index == 13 && current.handsBlock) return;
	useInventoryStore.setState({
		access: Object.assign({}, current.access, { bodyFocus: index }),
	});
}

export function onBodyItemLeave() {
	const access = state().access;
	if (access.bodyFocus == null) return;
	useInventoryStore.setState({
		access: Object.assign({}, access, { bodyFocus: null }),
	});
}

export function onHotkeyItemEnter(key: number) {
	const current = state();
	let hotkeyFocus = current.access.hotkeyFocus;
	const item = current.dragItem;
	useInventoryStore.setState({ hotkeyFocus: key });
	if (!item || !getItem(item.sqlId)) return;
	if (current.hotkeys[key] && getItem(current.hotkeys[key].sqlId)) return;
	if (!current.hotkeysList[item.itemId] && !(item.params && item.params.weaponHash)) return;
	hotkeyFocus = key;
	useInventoryStore.setState({
		access: Object.assign({}, state().access, { hotkeyFocus: hotkeyFocus }),
	});
}

export function onHotkeyItemLeave() {
	const access = state().access;
	useInventoryStore.setState({
		hotkeyFocus: null,
		access: Object.assign({}, access, { hotkeyFocus: null }),
	});
}

export function onColumnMouse(place: any, pocket: any, index: number, type: string) {
	const current = state();
	if (!current.controlEnable) return;
	if (!current.dragItem) return;
	const item = current.dragItem;
	const info = current.itemsInfo[item.itemId];
	if (!info) return;
	if (info.width > pocket.cols || info.height > pocket.rows) return;
	if (type === 'mouseleave') {
		useInventoryStore.setState({
			access: Object.assign({}, current.access, {
				placeSqlId: null,
				pocketI: null,
				deny: false,
				columns: {},
			}),
		});
		return;
	}
	let nextWeight = getCommonWeight();
	if (!getItem(item.sqlId)) nextWeight += info.weight;
	const pocketI = place.pockets.indexOf(pocket);
	const coord = indexToXY(pocket.rows, pocket.cols, index);
	if (!coord) return;
	coord.x = clamp(coord.x - parseInt(String(info.width / 2), 10), 0, pocket.cols - info.width);
	coord.y = clamp(coord.y - parseInt(String(info.height / 2), 10), 0, pocket.rows - info.height);
	const black = current.blackList[place.itemId];
	let deny = place.sqlId == item.sqlId || place.itemId == item.itemId || (place.sqlId > 0 && nextWeight > current.maxPlayerWeight && !getItem(item.sqlId)) || (black && black.indexOf(item.itemId) !== -1);
	let text: string | null = null;
	if (place.sqlId == item.sqlId) text = 'Предмет не может быть размещен в своем кармане';
	else if (place.itemId == item.itemId) text = 'Предмет не может быть размещен в предмете такого же типа';
	else if (place.sqlId > 0 && nextWeight > current.maxPlayerWeight && !getItem(item.sqlId)) text = 'Превышение по весу ' + nextWeight + ' из ' + current.maxPlayerWeight + ' кг';
	else if (black && black.indexOf(item.itemId) !== -1) {
		const itemInfo = current.itemsInfo[item.itemId];
		const placeInfo = current.itemsInfo[place.itemId];
		text = 'Нельзя положить ' + (itemInfo ? itemInfo.name : '') + ' в ' + (placeInfo ? placeInfo.name : '');
	}
	const map: { [key: string]: boolean } = {};
	let targetSqlId = current.access.targetSqlId;
	const cols = place.sqlId > 0 ? equipmentBusyColumns() : environmentBusyColumns();
	for (let x = 0; x < info.width; x++) {
		for (let y = 0; y < info.height; y++) {
			const cell = xyToIndex(pocket.rows, pocket.cols, { x: coord.x + x, y: coord.y + y });
			map[cell] = true;
			if (!deny) {
				deny = isColumnBusy(place, pocketI, cell, item, cols);
				if (deny) {
					if (current.mergeList[item.itemId]) {
						const target = getItemInColumn(place, pocketI, cell, cols);
						const canMerge = !!(target && current.mergeList[item.itemId].indexOf(target.itemId) !== -1 && place.sqlId > 0 && getItem(item.sqlId));
						targetSqlId = canMerge ? target.sqlId : null;
					}
				} else targetSqlId = null;
			}
		}
	}
	useInventoryStore.setState({
		itemNotif: { text: text, x: current.itemNotif.x, y: current.itemNotif.y },
		access: Object.assign({}, current.access, {
			placeSqlId: place.sqlId,
			pocketI: pocketI,
			deny: deny,
			targetSqlId: targetSqlId,
			columns: map,
		}),
	});
}

export function onBinMouse(type: string) {
	const access = state().access;
	useInventoryStore.setState({
		access: Object.assign({}, access, { binFocus: type === 'mouseenter' }),
	});
}

export function handleWindowClick() {
	if (!state().itemMenu.item) return;
	useInventoryStore.setState({ itemMenu: { item: null, x: 0, y: 0 } });
}

export function handleMouseMove(e: MouseEvent) {
	const current = state();
	if (!current.dragItem) return;
	const rect = inventoryRect();
	if (!rect) return;
	const x = e.screenX - rect.left;
	const y = e.screenY - rect.top;
	if (current.itemNotif.text) {
		useInventoryStore.setState({
			dragX: x,
			dragY: y,
			itemNotif: { text: current.itemNotif.text, x: x + 15, y: y + 15 },
		});
		return;
	}
	useInventoryStore.setState({ dragX: x, dragY: y });
}

export function handleMouseUp() {
	const current = state();
	const access = current.access;
	const item = current.dragItem;
	if (item) {
		if (access.bodyFocus != null) moveItemToBody(item, access.bodyFocus);
		else if (access.hotkeyFocus) bindHotkey(item.sqlId, access.hotkeyFocus);
		else if (access.targetSqlId) {
			deleteItem(item.sqlId);
			callRemote('item.merge', {
				sqlId: item.sqlId,
				targetSqlId: access.targetSqlId,
				pocketI: access.pocketI,
				placeSqlId: access.placeSqlId,
			});
		} else if (access.binFocus) {
			deleteItem(item.sqlId);
			putGroundHandler(item);
		} else {
			const rawIndex = Object.keys(access.columns)[0];
			const index = parseInt(rawIndex, 10);
			if (!access.deny && access.placeSqlId != null && access.pocketI != null && rawIndex != null && !isNaN(index)) {
				if (access.placeSqlId > 0) {
					if (!getItem(item.sqlId)) setWaitItem(item, true);
					addItem(item, access.pocketI, index, access.placeSqlId);
				} else {
					if (getItem(item.sqlId)) setWaitItem(item, true);
					addEnvironmentItem(item, access.pocketI, index, access.placeSqlId);
				}
				callRemote('item.add', {
					sqlId: item.sqlId,
					pocketI: access.pocketI,
					index: index,
					placeSqlId: access.placeSqlId,
				});
			}
		}
	}
	if (hotkeyUnbind) unbindHotkey(hotkeyUnbind);
	hotkeyUnbind = null;
	useInventoryStore.setState({
		dragItem: null,
		itemNotif: { text: null, x: 0, y: 0 },
		access: createAccess(),
	});
}

export function handleKeyUp(e: KeyboardEvent) {
	const busy = (window as any).busy;
	if (busy && busy.includes && busy.includes(['auth', 'chat', 'terminal', 'interaction', 'mapCase', 'phone', 'playerMenu', 'inputWindow', 'fishing.game', 'selectItems', 'playersList', 'bugTracker'])) return;
	const selectMenu = (window as any).selectMenu;
	if (selectMenu && selectMenu.isEditing) return;
	const current = state();
	if (Date.now() - current.lastShowTime < 500) return;
	if (e.keyCode == 73 && current.enable) setShow(!current.show);
	if (e.keyCode > 47 && e.keyCode < 57) onUseHotkey(e.keyCode - 48);
}

export { urlItemImg };
