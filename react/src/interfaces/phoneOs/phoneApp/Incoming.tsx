import React, { memo } from 'react';
import wallpaper from '@imgs/phone/os/wallpaper.jpg';
import { IconHandset } from './icons';
import styles from './index.module.css';
import { answerCall, declineCall, usePhoneAppStore } from './store';

function initials(name: string) {
	const parts = name.split(' ').filter(Boolean);
	return ((parts[0] && parts[0][0]) || '') + ((parts[1] && parts[1][0]) || '');
}

function Incoming() {
	const name = usePhoneAppStore(state => state.peerName);
	const phone = usePhoneAppStore(state => state.peerPhone);

	return (
		<div className={styles.stage} style={{ backgroundImage: 'url(' + wallpaper + ')' }}>
			<div className={styles.avatar}>{initials(name) || '#'}</div>
			<h1 className={styles.name}>{name || phone}</h1>
			<p className={styles.status}>входящий вызов</p>
			<div className={styles.pair}>
				<button type="button" onClick={declineCall}>
					<span className={styles.decline}>
						<IconHandset />
					</span>
					<span className={styles.caption}>отклонить</span>
				</button>
				<button type="button" onClick={answerCall}>
					<span className={styles.accept}>
						<IconHandset />
					</span>
					<span className={styles.caption}>принять</span>
				</button>
			</div>
		</div>
	);
}

export default memo(Incoming);
