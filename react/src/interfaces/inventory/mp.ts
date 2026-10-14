export function triggerMp(name: string, ...args: any[]) {
	if (typeof mp === 'undefined' || !mp || !mp.trigger) return;
	mp.trigger.apply(mp, [name].concat(args));
}

export function notifyInfo(message: string) {
	const notifications = (window as any).notifications;
	if (notifications && notifications.push) notifications.push('info', message, 'Инвентарь');
}

export function notifyError(message: string, title?: string) {
	const notifications = (window as any).notifications;
	if (notifications && notifications.error) notifications.error(message, title);
}
