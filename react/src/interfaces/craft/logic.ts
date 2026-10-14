export interface CraftMaterial {
	itemId: number;
	count: number;
}

export interface CraftItemDef {
	itemId: number;
	params: Record<string, any>;
	materials: CraftMaterial[];
	time: number;
	skill: number;
}

export interface CraftType {
	name: string;
	itemI: number;
	items: CraftItemDef[];
}

export interface CraftColumn {
	itemId?: number;
	state?: string;
	time?: number;
	maxTime?: number;
	playerName?: string;
}

export interface Crafter {
	name: string;
	description: string;
	destroyTime?: number;
	typeI: number;
	types: CraftType[];
	queue: {
		columns: CraftColumn[];
	};
}

export interface SkillInfo {
	min: number;
	max: number;
	level: number;
}

export function formatCraftTime(val: number) {
	let minutes: string | number = parseInt(String(val / 60), 10);
	let seconds: string | number = val % 60;
	if (minutes < 10) minutes = '0' + minutes;
	if (seconds < 10) seconds = '0' + seconds;
	return minutes + ':' + seconds;
}

export function formatItemName(val: string) {
	const len = 25;
	if (!val) return '';
	if (val.length > len) return val.substr(0, len) + '...';
	return val;
}

export function skillInfo(exp: number): SkillInfo | null {
	const info: SkillInfo = {
		min: 0,
		max: 30 * 60,
		level: 1,
	};
	let i = 1;
	while (i < 100000) {
		if (exp >= info.min && exp < info.max) return info;
		i++;
		info.min = info.max;
		info.max *= 2;
		info.level = i;
	}
	return null;
}

export function clampCount(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function inventory() {
	return (window as any).inventory;
}

export function playerName() {
	const playerMenu = (window as any).playerMenu;
	return playerMenu ? playerMenu.name : '';
}

export function itemName(itemId: number) {
	const inv = inventory();
	if (!inv || !inv.itemsInfo || !inv.itemsInfo[itemId]) return '';
	return inv.itemsInfo[itemId].name || '';
}

export function itemDescription(itemId: number) {
	const inv = inventory();
	if (!inv || !inv.itemsInfo || !inv.itemsInfo[itemId]) return '';
	return inv.itemsInfo[itemId].description || '';
}

export function itemImage(itemId: number) {
	const inv = inventory();
	if (!inv || !inv.urlItemImg) return '';
	return inv.urlItemImg(itemId);
}

export function prettyParams(itemId: number, params: any) {
	const inv = inventory();
	if (!inv || !inv.getPrettyParams) return [];
	return inv.getPrettyParams(itemId, params) || [];
}

export function materialCount(itemId: number) {
	const inv = inventory();
	if (!inv || !inv.getItemsByItemId) return 0;
	const items = inv.getItemsByItemId(itemId) || [];
	let count = items.length;
	items.forEach(function (item: any) {
		if (item.params && item.params.count) count += item.params.count - 1;
	});
	return count;
}

export function isDeficit(material: CraftMaterial) {
	return materialCount(material.itemId) < material.count;
}

export function materialLabel(item: CraftItemDef, material: CraftMaterial) {
	const name = material.count + ' ' + itemName(material.itemId);
	const isLast = item.materials.indexOf(material) == item.materials.length - 1;
	if (!isLast) return name + '/';
	return name;
}

export function currentTypeOf(crafter: Crafter | null) {
	if (!crafter || !crafter.types) return null;
	return crafter.types[crafter.typeI] || null;
}

export function currentItemOf(crafter: Crafter | null) {
	const type = currentTypeOf(crafter);
	if (!type || type.itemI < 0) return null;
	return type.items[type.itemI] || null;
}

export function canCraftItem(item: CraftItemDef | null, skill: number) {
	if (!item) return false;
	for (let i = 0; i < item.materials.length; i++) {
		if (isDeficit(item.materials[i])) return false;
	}
	return !(item.skill > skill);
}
