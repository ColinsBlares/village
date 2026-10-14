import React from 'react';
import styles from './index.module.css';
import { useInfoTableStore } from '../../store';

function Header() {
	const name = useInfoTableStore(state => state.name);
	const header = useInfoTableStore(state =>
		state.tables[name] ? state.tables[name].header : '',
	);

	return <div className={styles.header}>{header}</div>;
}

export default React.memo(Header);
