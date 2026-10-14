import React from 'react';
import styles from './index.module.css';
import { useModalStore } from '../../store';

function Header() {
	const activeName = useModalStore(state => state.activeName);
	const header = useModalStore(state =>
		activeName && state.modals[activeName] ? state.modals[activeName].header : '',
	);

	return <div className={styles.header}>{header}</div>;
}

export default React.memo(Header);
