import React, { memo, useEffect, useRef } from 'react';
import { catalog, pageCount, PAGE_W } from '../../grid';
import { exitEdit, lockPhone, movePager, openSwitcher, setHomePage, usePhoneOsStore } from '../../store';
import AppIcon from '../AppIcon';
import Dock from '../Dock';
import FamilyCard from '../FamilyCard';
import FamilyWidget from '../FamilyWidget';
import PageDots from '../PageDots';
import styles from './index.module.css';

function Tile({ tileKey, dock }: { tileKey: string; dock: boolean }) {
	const piece = catalog[tileKey];
	if (!piece) {
		return null;
	}
	if (piece.kind === 'card') {
		return <FamilyCard />;
	}
	if (piece.kind === 'widget') {
		return <FamilyWidget />;
	}
	return <AppIcon piece={piece} dock={dock} />;
}

const MemoTile = memo(Tile);

function Track() {
	const home = usePhoneOsStore(state => state.home);
	const offset = usePhoneOsStore(state => state.pageOffset);
	const anim = usePhoneOsStore(state => state.pageAnim);
	const dragKey = usePhoneOsStore(state => (state.drag ? state.drag.key : ''));
	const count = Math.max(1, pageCount(home));
	const pages = [];
	for (let index = 0; index < count; index += 1) {
		pages.push(index);
	}

	return (
		<div
			className={styles.track}
			style={{
				width: count * PAGE_W,
				transform: 'translate3d(' + offset + 'px,0,0)',
				transition: anim ? 'transform 0.46s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
			}}
		>
			{pages.map(function (page) {
				return (
					<div className={styles.sheet} key={page}>
						{home.map(function (place) {
							if ((place.page || 0) !== page || place.key === dragKey) {
								return null;
							}
							return <MemoTile key={place.key} tileKey={place.key} dock={false} />;
						})}
					</div>
				);
			})}
		</div>
	);
}

const MemoTrack = memo(Track);

function FloatTile() {
	const dragKey = usePhoneOsStore(state => (state.drag ? state.drag.key : ''));
	if (!dragKey) {
		return null;
	}
	return <MemoTile tileKey={dragKey} dock={false} />;
}

const MemoFloat = memo(FloatTile);

function DockIcons() {
	const dock = usePhoneOsStore(state => state.dock);
	const dragKey = usePhoneOsStore(state => (state.drag ? state.drag.key : ''));
	return (
		<>
			{dock.map(function (key) {
				if (!key || key === dragKey) {
					return null;
				}
				return <MemoTile key={key} tileKey={key} dock={true} />;
			})}
		</>
	);
}

const MemoDockIcons = memo(DockIcons);

function HomeScreen() {
	const phase = usePhoneOsStore(state => state.phase);
	const reveal = usePhoneOsStore(state => state.homeReveal);
	const startX = useRef(0);
	const startY = useRef(0);
	const startOffset = useRef(0);
	const origin = useRef(1);
	const pointer = useRef(-1);
	const fromTop = useRef(false);
	const fromBottom = useRef(false);
	const paging = useRef(false);
	const lastX = useRef(0);
	const lastT = useRef(0);
	const velocity = useRef(0);
	const unlisten = useRef<(() => void) | null>(null);
	const modeName = phase === 'unlocking' || reveal ? 'enter' : phase === 'locking' ? 'leave' : '';
	const mode = modeName === 'enter' ? styles.enter : modeName === 'leave' ? styles.leave : '';

	function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (phase !== 'home' || usePhoneOsStore.getState().switcher || usePhoneOsStore.getState().shade > 0) {
			return;
		}
		if (!event.currentTarget.contains(event.target as Node)) {
			return;
		}
		if ((event.target as HTMLElement).closest('button, [data-remove]')) {
			return;
		}
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = rect.width / event.currentTarget.offsetWidth || 1;
		const y = (event.clientY - rect.top) / scale;
		pointer.current = event.pointerId;
		startX.current = event.clientX;
		startY.current = event.clientY;
		startOffset.current = usePhoneOsStore.getState().pageOffset;
		origin.current = scale;
		fromTop.current = y > 36 && y < 92;
		fromBottom.current = y > 560;
		paging.current = false;
		lastX.current = event.clientX;
		lastT.current = event.timeStamp;
		velocity.current = 0;
		if (unlisten.current) {
			unlisten.current();
		}
		window.addEventListener('pointermove', onWindowMove);
		window.addEventListener('pointerup', onWindowUp);
		window.addEventListener('pointercancel', onWindowUp);
		unlisten.current = function () {
			window.removeEventListener('pointermove', onWindowMove);
			window.removeEventListener('pointerup', onWindowUp);
			window.removeEventListener('pointercancel', onWindowUp);
		};
	}

	function onWindowMove(event: PointerEvent) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		if (usePhoneOsStore.getState().drag) {
			if (paging.current) {
				paging.current = false;
				const page = usePhoneOsStore.getState().homePage;
				movePager(-page * PAGE_W, true);
			}
			return;
		}
		const scale = origin.current || 1;
		const dx = (event.clientX - startX.current) / scale;
		const dy = (event.clientY - startY.current) / scale;
		const dt = event.timeStamp - lastT.current;
		if (dt > 0) {
			velocity.current = (event.clientX - lastX.current) / scale / dt;
		}
		lastX.current = event.clientX;
		lastT.current = event.timeStamp;
		if (!paging.current) {
			if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) {
				return;
			}
			paging.current = true;
		}
		const state = usePhoneOsStore.getState();
		const count = pageCount(state.home);
		const min = -Math.max(0, count - 1) * PAGE_W;
		let next = startOffset.current + dx;
		if (next > 0) {
			next = next * 0.32;
		} else if (next < min) {
			next = min + (next - min) * 0.32;
		}
		movePager(next, false);
	}

	function endGesture(event: PointerEvent) {
		if (unlisten.current) {
			unlisten.current();
			unlisten.current = null;
		}
		if (event.pointerId !== pointer.current) {
			return;
		}
		pointer.current = -1;
		const scale = origin.current || 1;
		const dx = (event.clientX - startX.current) / scale;
		const dy = (event.clientY - startY.current) / scale;
		if (usePhoneOsStore.getState().drag) {
			paging.current = false;
			return;
		}
		if (paging.current) {
			const state = usePhoneOsStore.getState();
			const count = pageCount(state.home);
			let target = state.homePage;
			if (velocity.current < -0.45 || dx < -PAGE_W * 0.22) {
				target += 1;
			} else if (velocity.current > 0.45 || dx > PAGE_W * 0.22) {
				target -= 1;
			}
			setHomePage(Math.max(0, Math.min(count - 1, target)));
			paging.current = false;
			return;
		}
		if (usePhoneOsStore.getState().editing) {
			if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && !(event.target as HTMLElement).closest('[data-tile]')) {
				exitEdit();
			}
			return;
		}
		if (fromBottom.current && -dy > 36 && Math.abs(dy) > Math.abs(dx)) {
			openSwitcher();
			return;
		}
		if (fromTop.current && dy > 70 && Math.abs(dy) > Math.abs(dx)) {
			lockPhone();
		}
	}

	useEffect(function () {
		return function () {
			if (unlisten.current) {
				unlisten.current();
			}
		};
	}, []);

	function onWindowUp(event: PointerEvent) {
		endGesture(event);
	}

	return (
		<div
			className={styles.home + (mode ? ' ' + mode : '')}
			data-home="true"
			data-mode={modeName || 'idle'}
			onPointerDownCapture={onPointerDown}
		>
			<MemoTrack />
			<MemoFloat />
			<Dock />
			<MemoDockIcons />
			<PageDots />
		</div>
	);
}

export default memo(HomeScreen);
