import React, { memo } from 'react';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

function ItemNotif() {
	const notif = useInventoryStore(function (store) {
		return store.itemNotif;
	});

	if (!notif.text) return null;

	return (
		<div className={styles.notif} style={{ left: notif.x + 'px', top: notif.y + 'px' }}>
			{notif.text}
		</div>
	);
}

export default memo(ItemNotif);
