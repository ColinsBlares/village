import React, { memo } from 'react';
import styles from './index.module.css';
import { useSupermarketStore } from '../../store';

function Notice() {
	const notification = useSupermarketStore(state => state.notification);
	if (!notification) return null;
	return <div className={styles.notice}>{notification}</div>;
}

export default memo(Notice);
