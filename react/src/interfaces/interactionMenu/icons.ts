const modules = import.meta.glob('../../assets/imgs/interactionMenu/*', {
	eager: true,
	import: 'default',
}) as Record<string, string>;

const byName: Record<string, string> = {};

Object.keys(modules).forEach(function (path) {
	const parts = path.split('/');
	const name = parts[parts.length - 1];
	byName[name] = modules[path];
});

export function interactionIcon(file: string) {
	return byName[file] || byName['default.svg'] || '';
}
