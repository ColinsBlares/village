import React, { memo } from 'react';
import styles from './index.module.css';
import { useCarPassStore } from '../../store';

function Header() {
	const header = useCarPassStore(state => state.header);

	return <div className={styles.header}>{header}</div>;
}

export default memo(Header);
