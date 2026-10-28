import React, { memo, useRef } from 'react';
import { closeApp, closeSwitcher, lockPhone, openSwitcher, releaseShade, unlockPhone, usePhoneOsStore } from '../../store';
import { usePhoneAppStore } from '../../phoneApp/store';
import { useTaxiStore } from '../../taxiApp/store';
import styles from './index.module.css';

function HomeBar() {
	const phase = usePhoneOsStore(state => state.phase);
	const appId = usePhoneOsStore(state => state.appId);
	const theme = usePhoneOsStore(state => state.theme);
	const switcher = usePhoneOsStore(state => state.switcher);
	const phoneScreen = usePhoneAppStore(state => state.screen);
	const ready = usePhoneOsStore(state => state.appReady);
	const taxiScreen = useTaxiStore(state => state.screen);
	const onCall = appId === 'phone' && (phoneScreen === 'incoming' || phoneScreen === 'active');
	const ownDark = (appId === 'phone' && theme === 'dark') || onCall || ((appId === 'appstore' || appId === 'messages') && theme === 'dark') || (appId === 'taxi' && ready && taxiScreen === 'home');
	const dark = !!appId && !ownDark && !switcher;
	const startY = useRef(0);
	const scale = useRef(1);
	const moved = useRef(false);

	function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
		const rect = event.currentTarget.getBoundingClientRect();
		scale.current = rect.width / event.currentTarget.offsetWidth || 1;
		startY.current = event.clientY;
		moved.current = false;
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
	}

	function onPointerUp(event: PointerEvent) {
		window.removeEventListener('pointerup', onPointerUp);
		window.removeEventListener('pointercancel', onPointerUp);
		const dy = (event.clientY - startY.current) / (scale.current || 1);
		if (-dy > 36 && !usePhoneOsStore.getState().switcher) {
			moved.current = true;
			openSwitcher();
		}
	}

	function onClick() {
		if (moved.current) {
			moved.current = false;
			return;
		}
		if (usePhoneOsStore.getState().shade > 0.5) {
			releaseShade(0);
			return;
		}
		if (switcher) {
			closeSwitcher();
			if (appId) {
				closeApp();
			}
			return;
		}
		if (appId) {
			closeApp();
			return;
		}
		if (phase === 'lock') {
			unlockPhone();
			return;
		}
		if (phase === 'home') {
			lockPhone();
		}
	}

	return (
		<button
			type="button"
			className={styles.bar + (dark ? ' ' + styles.dark : '')}
			onPointerDown={onPointerDown}
			onClick={onClick}
		>
			<span />
		</button>
	);
}

export default memo(HomeBar);
