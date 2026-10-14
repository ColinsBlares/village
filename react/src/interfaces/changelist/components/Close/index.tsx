import React, { memo } from 'react';
import styles from './index.module.css';
import { setShow } from '../../store';

function Close() {
	return (
		<div
			className={styles.close}
			onClick={function () {
				setShow(false);
			}}
		>
			x
		</div>
	);
}

export default memo(Close);
