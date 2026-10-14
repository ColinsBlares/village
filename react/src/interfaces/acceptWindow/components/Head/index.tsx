import React from 'react';
import styles from './index.module.css';
import { useAcceptWindowStore } from '../../store';

function Head() {
	const header = useAcceptWindowStore(state => state.header);

	return <div className={styles.head}>{header}</div>;
}

export default React.memo(Head);
