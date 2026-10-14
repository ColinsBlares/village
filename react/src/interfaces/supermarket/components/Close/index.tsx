import React, { memo } from 'react';
import styles from './index.module.css';
import { closeShop } from '../../store';

function Close() {
	return (
		<button className={styles.close} onClick={function () { closeShop(); }}>
			×
		</button>
	);
}

export default memo(Close);
