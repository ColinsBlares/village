import React from 'react';
import { flushPendingEvents, wakeOnEvents, events } from './shared/events';
import { GameScreen } from './screens';
import {
	setScreenOpen,
	useVisibilityStore,
	VisibilityState,
} from './visibility/store';

interface QueuedCall {
	prop: string;
	args: any[];
	path?: string[];
}

interface HotkeyOptions {
	event?: 'keyup' | 'keydown';
	codes: number[];
	busy?: string[];
	requireEnable?: boolean;
	mode?: 'toggle' | 'open';
	when?: (bag: any) => boolean;
}

interface GlobalArm {
	name: string;
	methods?: string[];
}

interface LoadGroup {
	armed: Array<{ name: string; raw: any }>;
	promise: Promise<any> | null;
	eager: boolean;
}

export interface DefineScreenOptions {
	id: string;
	order?: number;
	eager?: boolean;
	gate?: keyof VisibilityState;
	load: () => Promise<any>;
	global?: string;
	globals?: GlobalArm[];
	isOpen?: (bag: any) => boolean;
	methods?: string[];
	events?: string[];
	select?: (state: VisibilityState) => boolean;
	hotkey?: HotkeyOptions;
	component?: string;
	read?: string;
	listen?: string;
}

const groups = new Map<() => Promise<any>, LoadGroup>();
const queues = new Map<string, QueuedCall[]>();
const readyGlobals = new Set<string>();
const runtimeOf = new WeakMap<any, any>();

function defaultSelect(id: keyof VisibilityState) {
	return function (state: VisibilityState) {
		return !!state[id];
	};
}

function groupFor(load: () => Promise<any>) {
	let group = groups.get(load);
	if (!group) {
		group = { armed: [], promise: null, eager: false };
		groups.set(load, group);
	}
	return group;
}

function snapshotBag(bag: any) {
	const data: { [key: string]: any } = {};
	if (!bag) {
		return data;
	}

	Object.keys(bag).forEach(function (key) {
		if (typeof bag[key] === 'function') {
			return;
		}
		data[key] = bag[key];
	});
	return data;
}

function replayData(
	name: string,
	data: { [key: string]: any },
	eager: boolean,
) {
	const bag = (window as any)[name];
	if (!bag) {
		return;
	}

	Object.keys(data).forEach(function (key) {
		if (eager && key === 'show' && !data[key]) {
			return;
		}

		const desc = Object.getOwnPropertyDescriptor(bag, key);
		if (desc && desc.get && !desc.set) {
			return;
		}
		if (desc && desc.writable === false) {
			return;
		}

		bag[key] = data[key];
	});
}

function flushQueue(name: string) {
	const queue = queues.get(name);
	if (!queue || !queue.length) {
		return;
	}

	const bag = (window as any)[name];
	const batch = queue.splice(0, queue.length);
	batch.forEach(function (job) {
		const path = job.path || [job.prop];
		let obj = bag;
		for (let i = 0; i < path.length - 1; i++) {
			if (obj == null) {
				return;
			}
			obj = obj[path[i]];
		}
		const fn = obj && obj[path[path.length - 1]];
		if (typeof fn === 'function') {
			fn.apply(obj, job.args);
		}
	});
}

export function defineScreen(options: DefineScreenOptions): GameScreen {
	const gate = (options.gate || options.id) as keyof VisibilityState;
	const select = options.select || defaultSelect(gate);
	const group = groupFor(options.load);
	if (options.eager) {
		group.eager = true;
	}
	let removeHotkey: (() => void) | null = null;
	let attached = false;
	const isOpen =
		options.isOpen ||
		function (bag: any) {
			return !!bag.show;
		};

	function publish(bag: any) {
		setScreenOpen(gate, !!isOpen(bag));
		if (select(useVisibilityStore.getState())) {
			ensure();
		}
	}

	function arm(name: string, methods: string[], watch: boolean) {
		const win = window as any;
		let raw = win[name];
		if (!raw || typeof raw !== 'object') {
			raw = {};
		}

		const queue: QueuedCall[] = [];
		queues.set(name, queue);

		function nested(path: string[]): any {
			const callable = function () {
				return undefined;
			};
			return new Proxy(callable, {
				get: function (_target, prop) {
					if (typeof prop !== 'string' || prop === 'then') {
						return undefined;
					}
					return nested(path.concat(prop));
				},
				apply: function (_target, _thisArg, args) {
					queue.push({
						prop: path[path.length - 1],
						path: path.slice(),
						args: Array.prototype.slice.call(args),
					});
					ensure();
				},
			});
		}

		const proxy = new Proxy(raw, {
			get: function (target, prop) {
				if (typeof prop !== 'string' || prop === 'then') {
					return undefined;
				}

				const value = target[prop];
				if (readyGlobals.has(name)) {
					return value;
				}

				const listed = methods.indexOf(prop) !== -1;
				if (
					!readyGlobals.has(name) &&
					name === 'selectMenu' &&
					prop === 'menus' &&
					value == null
				) {
					return nested(['menus']);
				}
				if (typeof value === 'function' || listed) {
					return function () {
						queue.push({
							prop: prop,
							args: Array.prototype.slice.call(arguments),
						});
						ensure();
					};
				}

				return value;
			},
			set: function (target, prop, value) {
				const ok = Reflect.set(target, prop, value);
				if (watch && typeof prop === 'string') {
					publish(target);
				}
				return ok;
			},
		});

		win[name] = proxy;
		group.armed.push({ name: name, raw: raw });
		if (watch && isOpen(raw)) {
			publish(raw);
		}
	}

	function loadOnce() {
		if (group.promise) {
			return group.promise;
		}

		if (removeHotkey) {
			removeHotkey();
			removeHotkey = null;
		}

		group.promise = options.load().then(function (mod) {
			const shots = group.armed.map(function (item) {
				return { name: item.name, data: snapshotBag(item.raw) };
			});
			const runtime = mod.default || {};
			const init = typeof mod.init === 'function' ? mod.init : runtime.init;
			const register =
				typeof mod.register === 'function' ? mod.register : runtime.register;

			if (typeof init === 'function') {
				init();
			}
			if (typeof register === 'function') {
				register(events);
			}

			group.armed.forEach(function (item) {
				readyGlobals.add(item.name);
			});
			shots.forEach(function (shot) {
				replayData(shot.name, shot.data, group.eager);
			});
			group.armed.forEach(function (item) {
				flushQueue(item.name);
			});
			flushPendingEvents();
			runtimeOf.set(mod, runtime);
			return mod;
		});

		return group.promise;
	}

	function componentOf(mod: any) {
		if (options.component && mod[options.component]) {
			return mod[options.component];
		}

		const runtime = runtimeOf.get(mod) || mod.default || {};
		return runtime.Component || null;
	}

	function attach(mod: any) {
		if (attached) {
			return;
		}
		attached = true;

		const runtime = runtimeOf.get(mod) || mod.default || {};
		const readName = options.read || 'readOpen';
		const listenName = options.listen || 'subscribe';
		const readOpen = mod[readName] || runtime[readName];
		const subscribe = mod[listenName] || runtime[listenName];

		if (typeof readOpen !== 'function') {
			return;
		}

		setScreenOpen(gate, !!readOpen());
		if (typeof subscribe === 'function') {
			subscribe(function () {
				setScreenOpen(gate, !!readOpen());
			});
		}
	}

	function ensure(): Promise<React.ComponentType<any> | null> {
		return loadOnce().then(function (mod) {
			attach(mod);
			return componentOf(mod);
		});
	}

	if (typeof window !== 'undefined' && options.global) {
		arm(options.global, options.methods || [], true);
	}

	(options.globals || []).forEach(function (extra) {
		if (typeof window === 'undefined') {
			return;
		}
		arm(extra.name, extra.methods || [], false);
	});

	if (options.events && options.events.length) {
		wakeOnEvents(options.events, ensure);
	}

	if (typeof window !== 'undefined' && options.hotkey && options.global) {
		const hotkey = options.hotkey;
		const eventName = hotkey.event || 'keyup';
		const globalName = options.global;

		const onHotkey = function (event: KeyboardEvent) {
			if (hotkey.codes.indexOf(event.keyCode) === -1) {
				return;
			}

			const win = window as any;
			if (
				hotkey.busy &&
				win.busy &&
				win.busy.includes &&
				win.busy.includes(hotkey.busy)
			) {
				return;
			}
			if (win.selectMenu && win.selectMenu.isEditing) {
				return;
			}

			const bag = win[globalName];
			if (!bag) {
				return;
			}
			if (hotkey.requireEnable && !bag.enable) {
				return;
			}
			if (hotkey.when && !hotkey.when(bag)) {
				return;
			}
			if (hotkey.mode === 'open') {
				bag.show = true;
			} else {
				bag.show = !bag.show;
			}
		};

		window.addEventListener(eventName, onHotkey);
		removeHotkey = function () {
			window.removeEventListener(eventName, onHotkey);
		};
	}

	if (options.eager) {
		ensure();
	}

	return {
		id: options.id,
		order: options.order,
		select: select,
		ensure: ensure,
	};
}
