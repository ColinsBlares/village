import React, { memo } from 'react';
import { usePhoneAppStore } from '../../phoneApp/store';
import { useTaxiStore } from '../../taxiApp/store';
import { usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function Signal() {
	return (
		<svg width="17" height="12" viewBox="0 0 17 12" aria-hidden="true">
			<rect x="0" y="7.2" width="3" height="4.8" rx="0.6" fill="currentColor" />
			<rect x="4.6" y="4.8" width="3" height="7.2" rx="0.6" fill="currentColor" />
			<rect x="9.2" y="2.4" width="3" height="9.6" rx="0.6" fill="currentColor" />
			<rect x="13.8" y="0" width="3" height="12" rx="0.6" fill="currentColor" />
		</svg>
	);
}

function Wifi() {
	return (
		<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
			<path
				fill="currentColor"
				d="M8 2.2c2.3 0 4.4.9 6 2.4l-1.2 1.3A6.6 6.6 0 0 0 8 4.1a6.6 6.6 0 0 0-4.8 1.8L2 4.6A8.4 8.4 0 0 1 8 2.2zm0 3.2c1.3 0 2.5.5 3.4 1.3L10.2 8A3.2 3.2 0 0 0 8 7.2 3.2 3.2 0 0 0 5.8 8L4.6 6.7A4.8 4.8 0 0 1 8 5.4zM8 8.7a1.15 1.15 0 0 1 .8.3l.7.8L8 11.6 6.5 9.8l.7-.8a1.15 1.15 0 0 1 .8-.3z"
			/>
		</svg>
	);
}

function Battery() {
	return (
		<svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
			<rect x="0.6" y="0.6" width="20.2" height="10.8" rx="2.6" fill="none" stroke="currentColor" strokeOpacity="0.35" />
			<rect x="2" y="2" width="15.4" height="8" rx="1.4" fill="currentColor" />
			<rect x="21.8" y="3.6" width="1.6" height="4.8" rx="0.7" fill="currentColor" opacity="0.4" />
		</svg>
	);
}

function StatusBar() {
	const time = usePhoneOsStore(state => state.time);
	const phase = usePhoneOsStore(state => state.phase);
	const appId = usePhoneOsStore(state => state.appId);
	const theme = usePhoneOsStore(state => state.theme);
	const face = usePhoneOsStore(state => state.face);
	const phoneScreen = usePhoneAppStore(state => state.screen);
	const ready = usePhoneOsStore(state => state.appReady);
	const taxiScreen = useTaxiStore(state => state.screen);
	const taxiDark = ready && taxiScreen === 'home';
	const locked = (phase === 'lock' || phase === 'locking') && face === 'full';
	const onCall = appId === 'phone' && (phoneScreen === 'incoming' || phoneScreen === 'active');
	const ownDark = (appId === 'phone' && (theme === 'dark' || onCall)) || ((appId === 'appstore' || appId === 'messages') && theme === 'dark') || (appId === 'taxi' && taxiDark);
	const tone = appId && !ownDark ? styles.dark : '';

	return (
		<div className={styles.bar + ' ' + tone}>
			<div className={styles.time}>{locked ? '' : time}</div>
			<div className={styles.icons}>
				<Signal />
				<Wifi />
				<Battery />
			</div>
		</div>
	);
}

export default memo(StatusBar);
