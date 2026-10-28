import React, { memo, useEffect } from 'react';
import wallpaper from '@imgs/phone/os/wallpaper.jpg';
import { IconHandset, IconMic, IconSpeaker } from './icons';
import styles from './index.module.css';
import { endCall, tickCall, toggleMute, toggleSpeaker, usePhoneAppStore } from './store';

function initials(name: string) {
	const parts = name.split(' ').filter(Boolean);
	return ((parts[0] && parts[0][0]) || '') + ((parts[1] && parts[1][0]) || '');
}

function clock(seconds: number) {
	const min = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return min + ':' + String(sec).padStart(2, '0');
}

function ActiveCall() {
	const name = usePhoneAppStore(state => state.peerName);
	const phone = usePhoneAppStore(state => state.peerPhone);
	const seconds = usePhoneAppStore(state => state.seconds);
	const muted = usePhoneAppStore(state => state.muted);
	const speaker = usePhoneAppStore(state => state.speaker);

	useEffect(function () {
		const timer = window.setInterval(tickCall, 1000);
		return function () {
			window.clearInterval(timer);
		};
	}, []);

	return (
		<div className={styles.stage} style={{ backgroundImage: 'url(' + wallpaper + ')' }}>
			<div className={styles.avatar}>{initials(name) || '#'}</div>
			<h1 className={styles.name}>{name || phone}</h1>
			<p className={styles.status}>{seconds ? clock(seconds) : 'вызов…'}</p>
			<div className={styles.controls}>
				<button type="button" className={styles.ctrl + (muted ? ' ' + styles.ctrlOn : '')} onClick={toggleMute}>
					<span className={styles.bubble}>
						<IconMic off={muted} />
					</span>
					без звука
				</button>
				<button type="button" className={styles.ctrl + (speaker ? ' ' + styles.ctrlOn : '')} onClick={toggleSpeaker}>
					<span className={styles.bubble}>
						<IconSpeaker on={speaker} />
					</span>
					динамик
				</button>
			</div>
			<button type="button" className={styles.end} onClick={endCall} aria-label="Завершить">
				<span className={styles.hang}>
					<IconHandset />
				</span>
			</button>
		</div>
	);
}

export default memo(ActiveCall);
