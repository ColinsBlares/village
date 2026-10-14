import React, { memo } from 'react';
import styles from './index.module.css';

function Header() {
	return <div className={styles.header}>Характеристики</div>;
}

export default memo(Header);
