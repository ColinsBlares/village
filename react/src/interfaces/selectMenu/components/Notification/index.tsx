import React, { memo } from 'react';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';

function Notification() {
	const notification = useSelectMenuStore(state => state.notification);
	if (!notification) return null;
	return <div className={styles.notification}>{notification}</div>;
}

export default memo(Notification);
