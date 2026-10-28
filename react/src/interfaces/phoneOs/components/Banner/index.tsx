import React, { memo } from 'react';
import NoticeCard from '../NoticeCard';
import { dismissBanner, openApp, setPhoneOsVisible, unlockPhone, usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function Banner() {
	const peek = usePhoneOsStore(state => state.face === 'peek');
	const notice = usePhoneOsStore(state => {
		if (!state.bannerId || state.shade > 0 || state.switcher) {
			return null;
		}
		const hidden = state.face === 'peek';
		if (!hidden && (state.phase === 'lock' || state.phase === 'locking' || state.phase === 'unlocking')) {
			return null;
		}
		const found = state.notices.find(function (item) {
			return item.id === state.bannerId;
		});
		return found || null;
	});
	if (!notice) {
		return null;
	}

	return (
		<div className={peek ? styles.slot + ' ' + styles.still : styles.slot}>
			<NoticeCard
				notice={notice}
				dismiss="y"
				onDismiss={dismissBanner}
				onPress={function () {
					const state = usePhoneOsStore.getState();
					if (!state.show) {
						setPhoneOsVisible(true);
						unlockPhone(notice.appId);
						return;
					}
					dismissBanner();
					if (state.phase === 'home') {
						openApp(notice.appId);
					}
				}}
			/>
		</div>
	);
}

export default memo(Banner);
