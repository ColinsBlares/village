import React from 'react';
import styles from './index.module.css';
import { setModalShow } from '../../store';

function Close() {
	return (
		<div
			className={styles.close}
			onClick={function () {
				setModalShow(false);
			}}
		>
			X
		</div>
	);
}

export default React.memo(Close);
