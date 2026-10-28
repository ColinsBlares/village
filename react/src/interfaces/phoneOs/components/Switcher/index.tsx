import React, { memo, useRef, useState } from 'react';
import { appInfo } from '../../apps';
import { closeSwitcher, dismissRunning, openApp, usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function Card({ id }: { id: string }) {
	const info = appInfo(id);
	const startX = useRef(0);
	const startY = useRef(0);
	const scroll = useRef(0);
	const pointer = useRef(-1);
	const axis = useRef('');
	const shiftRef = useRef(0);
	const [shift, setShift] = useState(0);
	const [live, setLive] = useState(false);
	const [fly, setFly] = useState(false);
	const theme = usePhoneOsStore(state => state.theme);
	const dark = theme === 'dark' && (id === 'phone' || id === 'appstore');
	if (!info) {
		return null;
	}

	function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
		if (fly) {
			return;
		}
		event.stopPropagation();
		pointer.current = event.pointerId;
		startX.current = event.clientX;
		startY.current = event.clientY;
		axis.current = '';
		const row = event.currentTarget.parentElement;
		scroll.current = row ? row.scrollLeft : 0;
		setLive(true);
	}

	function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
		if (event.pointerId !== pointer.current || fly) {
			return;
		}
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = rect.height / event.currentTarget.offsetHeight || 1;
		const dx = (event.clientX - startX.current) / scale;
		const dy = (event.clientY - startY.current) / scale;
		if (!axis.current) {
			if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
				return;
			}
			axis.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
		}
		if (axis.current === 'x') {
			const row = event.currentTarget.parentElement;
			if (row) {
				row.scrollLeft = scroll.current - dx;
			}
			return;
		}
		setShift(dy < 0 ? dy : dy * 0.2);
		shiftRef.current = dy < 0 ? dy : dy * 0.2;
	}

	function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		pointer.current = -1;
		setLive(false);
		if (axis.current === 'y' && shiftRef.current < -72) {
			setFly(true);
			setShift(-520);
			window.setTimeout(function () {
				dismissRunning(id);
			}, 220);
			return;
		}
		shiftRef.current = 0;
		if (!axis.current) {
			openApp(id);
			return;
		}
		setShift(0);
	}

	return (
		<button
			type="button"
			className={styles.card}
			style={{
				transform: 'translate3d(0,' + shift + 'px,0)',
				opacity: fly ? 0 : 1,
				transition: live ? 'none' : 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease',
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onClick={function (event) {
				event.stopPropagation();
			}}
		>
			<span className={styles.caption}>
				<img src={info.icon} alt="" draggable={false} />
				{info.name}
			</span>
			<span className={styles.preview + (dark ? ' ' + styles.dark : '')}>
				<span className={styles.previewBar}>
					<img src={info.icon} alt="" draggable={false} />
					{info.name}
				</span>
				<span className={styles.body}>
					<span className={styles.line} />
					<span className={styles.line} />
					<span className={styles.short} />
				</span>
				<span className={styles.homeMark} />
			</span>
		</button>
	);
}

const MemoCard = memo(Card);

function Switcher() {
	const open = usePhoneOsStore(state => state.switcher);
	const running = usePhoneOsStore(state => state.running);
	if (!open) {
		return null;
	}

	return (
		<div className={styles.layer} onClick={closeSwitcher}>
			<div className={styles.row}>
				{running.length === 0 ? <p className={styles.empty}>Нет открытых приложений</p> : null}
				{running.map(function (id) {
					return <MemoCard key={id} id={id} />;
				})}
			</div>
		</div>
	);
}

export default memo(Switcher);
