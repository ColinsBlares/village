export function gameTrigger(name: string, ...args: unknown[]) {
	const host = typeof window !== 'undefined' ? (window as unknown as { mp?: { trigger?: (...params: unknown[]) => void } }).mp : undefined;
	if (host && typeof host.trigger === 'function') {
		host.trigger(name, ...args);
	}
}

export function gameReady() {
	const host = typeof window !== 'undefined' ? (window as unknown as { mp?: { trigger?: unknown } }).mp : undefined;
	return !!(host && typeof host.trigger === 'function');
}
