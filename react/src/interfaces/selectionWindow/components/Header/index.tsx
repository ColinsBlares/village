import React from 'react';
import styles from './index.module.css';
import { useSelectionWindowStore } from '../../store';

function Header() {
	const header = useSelectionWindowStore(state => state.header);

	return <div className={styles.header}>{header}</div>;
}

export default React.memo(Header);
