import React, { memo, useRef } from 'react';
import taxiLogo from '@imgs/phone/taxi/logo-dark.png';
import { appInfo } from '../../apps';
import { closeApp, usePhoneOsStore } from '../../store';
import AppContent from '../AppContent';
import styles from './index.module.css';

function BackIcon() {
	return (
		<svg width='18' height='18' viewBox='0 0 18 18' aria-hidden='true'>
			<path
				d='M11.4 3.4 6.2 9l5.2 5.6'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function AppPage() {
	const appId = usePhoneOsStore(state => state.appId);
	const ready = usePhoneOsStore(state => state.appReady);
	const theme = usePhoneOsStore(state => state.theme);
	const startY = useRef(0);
	const pointer = useRef(-1);
	const info = appId ? appInfo(appId) : null;

	if (!appId || !info) {
		return null;
	}

	function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if ((event.target as HTMLElement).closest('button, input, textarea, label')) {
			return;
		}
		pointer.current = event.pointerId;
		startY.current = event.clientY;
	}

	function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		pointer.current = -1;
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = rect.height / event.currentTarget.offsetHeight || 1;
		if ((event.clientY - startY.current) / scale > 70) {
			closeApp();
		}
	}

	const taxiSplash = !ready && appId === 'taxi';
	const skinned = ready && (appId === 'phone' || appId === 'appstore' || appId === 'messages' || appId === 'taxi');
	const skin = skinned ? (theme === 'dark' ? styles.phoneDark : styles.phoneLight) : '';

	return (
		<div
			className={styles.page + (skin ? ' ' + skin : '') + (taxiSplash ? ' ' + styles.taxiSplash : '')}
			onPointerDown={onPointerDown}
			onPointerUp={onPointerUp}
		>
			{ready ? (
				<>
					{skinned ? null : (
						<button type='button' className={styles.back} onClick={closeApp}>
							<BackIcon />
							Назад
						</button>
					)}
					<AppContent id={appId} />
				</>
			) : taxiSplash ? (
				<div className={styles.taxiLoad}>
					<img src={taxiLogo} alt="" draggable={false} />
				</div>
			) : (
				<div className={styles.body}>
					<img
						className={styles.icon}
						src={info.icon}
						alt=''
						draggable={false}
					/>
					<h1 className={styles.title}>{info.name}</h1>
				</div>
			)}
		</div>
	);
}

export default memo(AppPage);
