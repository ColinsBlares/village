export function valuesType(menu: any, index: number): number {
	const item = menu.items[index];
	const values = item.values;
	if (item.type == 'editable') return 3;
	if (!values || values[0] === '') return -1;
	if (values[0][0] == '#') return 1;
	for (let i = 0; i < values.length; i++) {
		if (typeof values[i] != 'number') return 0;
	}
	return 2;
}

export function itemValuesType(menu: any, index: number): number {
	if (!menu || !menu.items || !menu.items[index]) return -1;
	return valuesType(menu, index);
}

export function isItemVisible(menu: any, index: number, maxItems: number): boolean {
	return index >= menu.j && index <= menu.j + maxItems - 1;
}

export function isColorVisible(item: any, index: number, maxColorValues: number): boolean {
	return index >= item.j && index <= item.j + maxColorValues - 1;
}

export function currentItem(menu: any): any {
	if (!menu || !menu.items) return null;
	return menu.items[menu.i] || null;
}

export function selectorValues(menu: any): any[] | null {
	if (!menu || !menu.items || !menu.items[menu.i]) return null;
	const item = menu.items[menu.i];
	const values = item.values;
	if (!values) return null;
	const i = item.i;
	return [values[i - 1] || '', values[i], values[i + 1] || ''];
}

export function leftNumberType(menu: any): string {
	const offset = 3.5;
	const item = menu.items[menu.i];
	if (item.i == 0) return 0 - offset + '%';
	const values = item.values;
	const minValue = values[0];
	const maxValue = values[values.length - 1];
	const curValue = values[item.i];
	return (curValue - minValue) / (maxValue - minValue) * 100 - offset + '%';
}

export function isEditing(show: boolean, menu: any): boolean {
	return !!(show && menu && menu.items && menu.items[menu.i] && valuesType(menu, menu.i) == 3);
}

export function itemLabel(text: any): string {
	if (text == null) return '';
	return String(text).replace(/\\/g, '');
}
