import React, { memo, useRef, useState } from 'react';
import NoticeCard from '../NoticeCard';
import { dismissNotice, toggleFlashlight, unlockPhone, usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function FlashlightIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M7.2 2.2h9.6v2.1H7.2V2.2zm-.8 3.2h11.2L19 8.2v1.2H5V8.2l1.4-2.8zM7.4 10.6h9.2v7.8c0 1-.8 1.8-1.8 1.8H9.2c-1 0-1.8-.8-1.8-1.8v-7.8zm2.6 1.7h4v1.15h-4V12.3z"
			/>
		</svg>
	);
}

function CameraIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M9 6.2 10.2 4.4h3.6L15 6.2h2.4A2.6 2.6 0 0 1 20 8.8v6.6a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 15.4V8.8a2.6 2.6 0 0 1 2.6-2.6H9zm3 9.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2z"
			/>
		</svg>
	);
}

function LockNotices() {
	const notices = usePhoneOsStore(state => state.notices);
	if (notices.length === 0) {
		return null;
	}

	return (
		<div className={styles.stack}>
			{notices.map(function (notice) {
				return (
					<NoticeCard
						key={notice.id}
						notice={notice}
						dismiss="x"
						onDismiss={function () {
							dismissNotice(notice.id);
						}}
						onPress={function () {
							unlockPhone(notice.appId);
						}}
					/>
				);
			})}
		</div>
	);
}

const MemoLockNotices = memo(LockNotices);

function LockScreen() {
	const phase = usePhoneOsStore(state => state.phase);
	const time = usePhoneOsStore(state => state.time);
	const dateLine = usePhoneOsStore(state => state.dateLine);
	const flashlight = usePhoneOsStore(state => state.flashlight);
	const [drag, setDrag] = useState(0);
	const [dragging, setDragging] = useState(false);
	const startY = useRef(0);
	const moved = useRef(0);
	const pointer = useRef(-1);

	function localDelta(event: React.PointerEvent<HTMLDivElement>) {
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = rect.height / event.currentTarget.offsetHeight || 1;
		return (event.clientY - startY.current) / scale;
	}

	function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (phase !== 'lock') {
			return;
		}
		if ((event.target as HTMLElement).closest('button')) {
			return;
		}
		pointer.current = event.pointerId;
		startY.current = event.clientY;
		moved.current = 0;
		setDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerId !== pointer.current || phase !== 'lock') {
			return;
		}
		const delta = localDelta(event);
		moved.current = delta;
		if (delta >= 0) {
			setDrag(delta * 0.18);
			return;
		}
		const limited = delta < -210 ? -210 + (delta + 210) * 0.22 : delta;
		setDrag(limited);
	}

	function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		pointer.current = -1;
		setDragging(false);
		if (moved.current < -86) {
			unlockPhone();
			return;
		}
		setDrag(0);
	}

	function onClickCapture(event: React.MouseEvent) {
		if (Math.abs(moved.current) > 10) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	const mode = phase === 'unlocking' ? styles.out : phase === 'locking' ? styles.in : '';

	return (
		<div
			className={styles.lock + (mode ? ' ' + mode : '')}
			style={{
				transform: phase === 'lock' ? 'translateY(' + drag + 'px)' : undefined,
				transition: dragging || phase !== 'lock' ? 'none' : 'transform .45s cubic-bezier(.22,1,.36,1)',
				['--shift' as string]: drag + 'px',
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onClickCapture={onClickCapture}
		>
			<div className={styles.clock}>
				<div className={styles.date}>{dateLine}</div>
				<div className={styles.time}>{time}</div>
			</div>
			<MemoLockNotices />
			<button
				type="button"
				className={styles.tool + ' ' + styles.flash + (flashlight ? ' ' + styles.on : '')}
				onClick={toggleFlashlight}
			>
				<FlashlightIcon />
			</button>
			<button type="button" className={styles.tool + ' ' + styles.camera} onClick={function () { unlockPhone('camera'); }}>
				<CameraIcon />
			</button>
		</div>
	);
}

export default memo(LockScreen);
