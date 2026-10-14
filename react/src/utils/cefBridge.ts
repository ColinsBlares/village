export function prettyMoney(val: number | string): string {
	return ('' + val).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

export function getPaddingNumber(value: number | string, max: number): string {
	let text = '' + value;
	while (text.length < max) {
		text = '0' + text;
	}
	return text;
}

export function bindCefObject(
	name: string,
	keys: string[],
	read: (key: string) => any,
	write: (key: string, value: any) => void,
	methods?: { [key: string]: (...args: any[]) => any },
) {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win[name] || {};

	keys.forEach(function (key) {
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get: function () {
				return read(key);
			},
			set: function (value) {
				write(key, value);
			},
		});
	});

	if (methods) {
		Object.keys(methods).forEach(function (key) {
			target[key] = methods[key];
		});
	}

	win[name] = target;
}
