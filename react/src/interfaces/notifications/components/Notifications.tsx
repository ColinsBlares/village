import React from 'react';
import styles from './Notifications.module.css';
import List from './List';

function Notifications() {
	return (
		<div id="notifications" className={styles.root}>
			<List />
		</div>
	);
}

export default React.memo(Notifications);
