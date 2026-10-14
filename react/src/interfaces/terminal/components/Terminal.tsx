import React, { memo } from 'react';
import styles from './Terminal.module.css';
import { useTerminalStore } from '../store';
import Header from './Header';
import Messages from './Messages';
import Input from './Input';

function Terminal() {
	const pos = useTerminalStore(state => state.pos);

	return (
		<div className={styles.root} style={{ left: pos.x + 'px', top: pos.y + 'px' }}>
			<Header />
			<Messages />
			<Input />
		</div>
	);
}

export default memo(Terminal);
