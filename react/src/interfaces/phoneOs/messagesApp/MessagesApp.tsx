import React, { memo } from 'react';
import { usePhoneOsStore } from '../store';
import Compose from './Compose';
import Inbox from './Inbox';
import styles from './index.module.css';
import { useMessagesStore } from './store';
import ThreadView from './Thread';

function MessagesApp() {
	const theme = usePhoneOsStore(state => state.theme);
	const screen = useMessagesStore(state => state.screen);

	return (
		<div className={styles.root} data-theme={theme}>
			{screen === 'list' ? <Inbox /> : null}
			{screen === 'thread' ? <ThreadView /> : null}
			{screen === 'compose' ? <Compose /> : null}
		</div>
	);
}

export default memo(MessagesApp);
