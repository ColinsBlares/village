export function triggerMp(name: string, ...args: unknown[]) {
	if (typeof mp === 'undefined' || !mp || !mp.trigger) return;
	mp.trigger.apply(mp, [name].concat(args as never[]));
}
