import { useEffect, useRef } from 'react';
import { iconOrigin, readSlot } from './grid';
import { dropDrag, moveDrag, startDrag, usePhoneOsStore } from './store';

interface Session {
	key: string;
	pointer: number;
	ox: number;
	oy: number;
	cx: number;
	cy: number;
	held: boolean;
	shifted: boolean;
	timer: number;
}

let session: Session | null = null;
let suppressClick = false;

function homePoint(event: PointerEvent) {
	const home = document.querySelector('[data-home]') as HTMLElement | null;
	if (!home) {
		return null;
	}
	const rect = home.getBoundingClientRect();
	const scale = rect.width / home.offsetWidth || 1;
	return {
		x: (event.clientX - rect.left) / scale,
		y: (event.clientY - rect.top) / scale,
	};
}

function unbind() {
	window.removeEventListener('pointermove', onWindowMove);
	window.removeEventListener('pointerup', onWindowUp);
	window.removeEventListener('pointercancel', onWindowUp);
}

function onWindowMove(event: PointerEvent) {
	if (!session || event.pointerId !== session.pointer) {
		return;
	}
	const point = homePoint(event);
	if (!point) {
		return;
	}
	const dist = Math.hypot(event.clientX - session.cx, event.clientY - session.cy);
	const editingNow = usePhoneOsStore.getState().editing;
	if (!session.held && dist > (editingNow ? 3 : 8)) {
		session.shifted = true;
		window.clearTimeout(session.timer);
		if (editingNow) {
			session.held = true;
			startDrag(session.key);
		}
	}
	const active = usePhoneOsStore.getState().drag;
	if (!active || active.key !== session.key || active.settle) {
		return;
	}
	moveDrag(point.x - session.ox, point.y - session.oy);
}

function onWindowUp(event: PointerEvent) {
	if (!session || event.pointerId !== session.pointer) {
		return;
	}
	window.clearTimeout(session.timer);
	const key = session.key;
	if (session.held || session.shifted) {
		suppressClick = true;
	}
	session = null;
	unbind();
	const active = usePhoneOsStore.getState().drag;
	if (active && active.key === key) {
		dropDrag();
	}
}

export function useHoldDrag(key: string, onOpen: () => void) {
	const slot = usePhoneOsStore(state => readSlot(state.home, state.dock, state.drag, key));
	const dragging = usePhoneOsStore(state => !!state.drag && state.drag.key === key && !state.drag.settle);
	const editing = usePhoneOsStore(state => state.editing);
	const timer = useRef(0);

	useEffect(function () {
		return function () {
			window.clearTimeout(timer.current);
		};
	}, []);

	function onPointerDown(event: React.PointerEvent) {
		if (event.button !== 0) {
			return;
		}
		if ((event.target as HTMLElement).closest('[data-remove]')) {
			return;
		}
		event.stopPropagation();
		suppressClick = false;
		const home = (event.currentTarget as HTMLElement).closest('[data-home]') as HTMLElement | null;
		if (!home) {
			return;
		}
		const rect = home.getBoundingClientRect();
		const scale = rect.width / home.offsetWidth || 1;
		const point = {
			x: (event.clientX - rect.left) / scale,
			y: (event.clientY - rect.top) / scale,
		};
		const state = usePhoneOsStore.getState();
		const current = readSlot(state.home, state.dock, null, key);
		if (!current) {
			return;
		}
		const origin = iconOrigin(key, current, state.dock.indexOf(key) >= 0);
		if (session) {
			window.clearTimeout(session.timer);
			unbind();
		}
		session = {
			key: key,
			pointer: event.pointerId,
			ox: point.x - origin.x,
			oy: point.y - origin.y,
			cx: event.clientX,
			cy: event.clientY,
			held: false,
			shifted: false,
			timer: 0,
		};
		window.addEventListener('pointermove', onWindowMove);
		window.addEventListener('pointerup', onWindowUp);
		window.addEventListener('pointercancel', onWindowUp);
		if (state.editing) {
			return;
		}
		const activeKey = key;
		session.timer = window.setTimeout(function () {
			if (!session || session.key !== activeKey) {
				return;
			}
			session.held = true;
			startDrag(activeKey);
		}, 420);
		timer.current = session.timer;
	}

	function onClick() {
		if (suppressClick || usePhoneOsStore.getState().editing) {
			suppressClick = false;
			return;
		}
		onOpen();
	}

	function onContextMenu(event: React.MouseEvent) {
		event.preventDefault();
	}

	let shake = 0;
	for (let i = 0; i < key.length; i += 1) {
		shake += key.charCodeAt(i);
	}

	return {
		slot: slot,
		dragging: dragging,
		editing: editing,
		shakeDelay: -((shake % 5) * 0.06) + 's',
		bind: {
			onPointerDown: onPointerDown,
			onClick: onClick,
			onContextMenu: onContextMenu,
		},
	};
}
