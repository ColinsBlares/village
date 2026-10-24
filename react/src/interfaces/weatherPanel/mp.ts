export function triggerMp(name: string, ...args: unknown[]) {
	if (typeof mp === 'undefined' || !mp || !mp.trigger) return;
	mp.trigger.apply(mp, [name].concat(args as never[]));
}

export function send(action: string, extra?: { [key: string]: unknown }) {
	triggerMp('callRemote', 'weather.action', JSON.stringify(Object.assign({ action: action }, extra || {})));
}
