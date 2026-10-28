import React, { memo } from 'react';
import styles from './index.module.css';

function Dock() {
	return <div className={styles.dock} />;
}

export default memo(Dock);
