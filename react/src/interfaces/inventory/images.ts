const itemModules = import.meta.glob('../../assets/imgs/inventory/items/*.png', {
	eager: true,
	import: 'default',
});

const itemImageByFile: { [file: string]: string } = {};
const moduleKeys = Object.keys(itemModules);

for (let i = 0; i < moduleKeys.length; i++) {
	const key = moduleKeys[i];
	const parts = key.split('/');
	const file = parts[parts.length - 1];
	itemImageByFile[file] = itemModules[key] as string;
}

export function urlItemImg(itemId: number | string) {
	const file = String(itemId) + '.png';
	if (itemImageByFile[file]) return itemImageByFile[file];
	return 'img/inventory/items/' + itemId + '.png';
}
