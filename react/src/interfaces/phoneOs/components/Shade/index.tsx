import React, { memo, useRef } from 'react';
import NoticeCard from '../NoticeCard';
import { dismissNotice, openApp, pullShade, releaseShade, usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function scaleOf(node: HTMLElement) {
	const rect = node.getBoundingClientRect();
	return rect.height / node.offsetHeight || 1;
}

function Shade() {
	const shade = usePhoneOsStore(state => state.shade);
	const drag = usePhoneOsStore(state => state.shadeDrag);
	const notices = usePhoneOsStore(state => state.notices);
	const startY = useRef(0);
	const startShade = useRef(0);
	const scale = useRef(1);
	const active = useRef(false);

	function begin(event: React.PointerEvent<HTMLDivElement>) {
		const phase = usePhoneOsStore.getState().phase;
		if (phase !== 'home' || usePhoneOsStore.getState().switcher) {
			return;
		}
		if ((event.target as HTMLElement).closest('button')) {
			return;
		}
		active.current = true;
		startY.current = event.clientY;
		startShade.current = usePhoneOsStore.getState().shade;
		scale.current = scaleOf((event.currentTarget as HTMLElement) || (event.target as HTMLElement));
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', end);
		window.addEventListener('pointercancel', end);
	}

	function move(event: PointerEvent) {
		if (!active.current) {
			return;
		}
		const dy = (event.clientY - startY.current) / (scale.current || 1);
		pullShade(startShade.current + dy / 280, true);
	}

	function end(event: PointerEvent) {
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', end);
		window.removeEventListener('pointercancel', end);
		if (!active.current) {
			return;
		}
		active.current = false;
		const dy = (event.clientY - startY.current) / (scale.current || 1);
		releaseShade(startShade.current + dy / 280);
	}

	const motion = drag ? 'none' : 'transform 0.46s cubic-bezier(0.22, 1, 0.36, 1)';

	return (
		<>
			<div
				className={styles.scrim}
				style={{
					opacity: shade,
					pointerEvents: shade > 0.04 ? 'auto' : 'none',
				}}
				onClick={function () {
					releaseShade(0);
				}}
			/>
			<div className={styles.hit} onPointerDown={begin} />
			<div
				className={styles.sheet}
				aria-hidden={shade < 0.2}
				style={{
					transform: 'translate3d(0,' + (shade - 1) * 100 + '%,0)',
					transition: motion,
					pointerEvents: shade > 0.02 ? 'auto' : 'none',
				}}
			>
				<div className={styles.list}>
					{notices.length === 0 ? <p className={styles.empty}>Нет уведомлений</p> : null}
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
									const phase = usePhoneOsStore.getState().phase;
									releaseShade(0);
									if (phase === 'home') {
										openApp(notice.appId);
									}
								}}
							/>
						);
					})}
				</div>
				<div className={styles.grab} onPointerDown={begin} />
			</div>
		</>
	);
}

export default memo(Shade);
