import React, { memo } from 'react';
import { answerCall, declineCall, usePhoneAppStore } from '../../phoneApp/store';
import { dismissCallPeek, revealOnto } from '../../store';
import { IconHandset } from '../../phoneApp/icons';
import styles from './index.module.css';

function CallPeek() {
	const name = usePhoneAppStore(state => state.peerName);
	const phone = usePhoneAppStore(state => state.peerPhone);
	const title = name || phone || 'Неизвестный';

	return (
		<div className={styles.peek}>
			<strong>{title}</strong>
			<span>входящий вызов</span>
			<div className={styles.pair}>
				<button
					type="button"
					onClick={function () {
						declineCall();
						dismissCallPeek();
					}}
				>
					<span className={styles.decline}>
						<IconHandset />
					</span>
					отклонить
				</button>
				<button
					type="button"
					onClick={function () {
						answerCall();
						revealOnto('phone');
					}}
				>
					<span className={styles.accept}>
						<IconHandset />
					</span>
					принять
				</button>
			</div>
		</div>
	);
}

export default memo(CallPeek);
