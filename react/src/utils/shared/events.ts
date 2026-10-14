type EventHandler = (...args: any[]) => void;

const listeners = new Map<string, Set<EventHandler>>();
const starters = new Map<string, Array<() => void>>();
const pending: Array<{ name: string; args: any[] }> = [];

function on(eventName: string, handler: EventHandler) {
	const handlers = listeners.get(eventName);

	if (handlers) {
		handlers.add(handler);
		return;
	}

	listeners.set(eventName, new Set([handler]));
}

function dispatch(eventName: string, args: any[]) {
	const handlers = listeners.get(eventName);

	if (!handlers || !handlers.size) {
		return false;
	}

	handlers.forEach(function (handler) {
		handler.apply(null, args);
	});
	return true;
}

function call(eventName: string, ...args: any[]) {
	if (dispatch(eventName, args)) {
		return;
	}

	const starts = starters.get(eventName);
	if (!starts || !starts.length) {
		return;
	}

	pending.push({ name: eventName, args: args });
	starts.forEach(function (start) {
		start();
	});
}

function remove(eventName: string, handler: EventHandler) {
	const handlers = listeners.get(eventName);

	if (!handlers) {
		return;
	}

	handlers.delete(handler);
}

export function wakeOnEvents(names: string[], start: () => void) {
	names.forEach(function (name) {
		const list = starters.get(name) || [];
		list.push(start);
		starters.set(name, list);
	});
}

export function flushPendingEvents() {
	let index = 0;

	while (index < pending.length) {
		if (dispatch(pending[index].name, pending[index].args)) {
			pending.splice(index, 1);
		} else {
			index += 1;
		}
	}
}

export const events: GameEvents = {
	on,
	call,
	remove,
};
