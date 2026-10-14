import React from 'react';
import styles from './index.module.css';
import { useInputWindowStore } from '../../store';

function Header() {
	const header = useInputWindowStore(state => state.header);

	return <div className={styles.header}>{header}</div>;
}

export default React.memo(Header);
