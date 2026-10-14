export function cx(...parts: Array<string | false | null | undefined>) {
	let out = '';
	for (let i = 0; i < parts.length; i++) {
		if (parts[i]) out += (out ? ' ' : '') + parts[i];
	}
	return out;
}
