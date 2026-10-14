import React, { memo } from 'react';
import styles from './index.module.css';
import { closeCharacterPass } from '../../store';

function Close() {
	return (
		<span className={styles.close} onClick={closeCharacterPass}>
			x
		</span>
	);
}

export default memo(Close);
