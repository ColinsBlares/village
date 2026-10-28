import React, { memo, useRef, useState } from 'react';
import { appInfo } from '../../apps';
import type { PhoneNotice } from '../../store';
import styles from './index.module.css';

interface NoticeCardProps {
	notice: PhoneNotice;
	dismiss: 'x' | 'y';
	onPress: () => void;
	onDismiss: () => void;
}

function NoticeCard({ notice, dismiss, onPress, onDismiss }: NoticeCardProps) {
	const info = appInfo(notice.appId);
	const startX = useRef(0);
	const startY = useRef(0);
	const pointer = useRef(-1);
	const moved = useRef(false);
	const shiftRef = useRef(0);
	const [shift, setShift] = useState(0);

	function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
		event.stopPropagation();
		pointer.current = event.pointerId;
		startX.current = event.clientX;
		startY.current = event.clientY;
		moved.current = false;
		shiftRef.current = 0;
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = rect.width / event.currentTarget.offsetWidth || 1;
		const dx = (event.clientX - startX.current) / scale;
		const dy = (event.clientY - startY.current) / scale;
		const delta = dismiss === 'y' ? dy : dx;
		if (Math.abs(delta) > 6) {
			moved.current = true;
		}
		const next = delta < 0 ? delta : delta * 0.22;
		shiftRef.current = next;
		setShift(next);
	}

	function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		pointer.current = -1;
		event.stopPropagation();
		if (shiftRef.current < -48) {
			onDismiss();
			return;
		}
		shiftRef.current = 0;
		setShift(0);
		if (!moved.current) {
			onPress();
		}
	}

	const transform = dismiss === 'y' ? 'translate3d(0,' + shift + 'px,0)' : 'translate3d(' + shift + 'px,0,0)';

	return (
		<button
			type="button"
			className={styles.card}
			style={{ transform: transform }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
		>
			<span className={styles.head}>
				{info ? <img src={info.icon} alt="" draggable={false} /> : null}
				<span className={styles.app}>{info ? info.name : notice.title}</span>
				<span className={styles.time}>{notice.time}</span>
			</span>
			<span className={styles.title}>{notice.title}</span>
			<span className={styles.text}>{notice.text}</span>
		</button>
	);
}

export default memo(NoticeCard);
