import React, { memo } from 'react';
import styles from './index.module.css';
import { useCharacterPassStore } from '../../store';

function Header() {
	const header = useCharacterPassStore(state => state.header);

	return <div className={styles.header}>{header}</div>;
}

export default memo(Header);
