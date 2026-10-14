import React, { memo } from 'react';
import styles from './index.module.css';
import { onHeaderMouseDown, setTerminalShow } from '../../store';

function Header() {
	return (
		<div
			className={styles.header}
			onMouseDown={function (e) {
				onHeaderMouseDown(e.pageX, e.pageY);
			}}
		>
			<div>Консоль разработчика</div>
			<div
				className={styles.close}
				onClick={function () {
					setTerminalShow(false);
				}}
			>
				x
			</div>
		</div>
	);
}

export default memo(Header);
