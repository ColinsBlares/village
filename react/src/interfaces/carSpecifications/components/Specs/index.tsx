import React, { memo } from 'react';
import styles from './index.module.css';
import { useCarSpecificationsStore } from '../../store';

function Specs() {
	const body = useCarSpecificationsStore(state => state.body);
	const keys = Object.keys(body);
	const rows = [];

	for (let i = 0; i < keys.length; i++) {
		const record = body[keys[i]];
		rows.push(
			<div className={styles.record} key={keys[i]}>
				<div className={styles.left}>{record.header}</div>
				<div className={styles.right}>
					{record.value} {record.unit}
				</div>
				<div className={styles.line} />
			</div>,
		);
	}

	return <div className={styles.body}>{rows}</div>;
}

export default memo(Specs);
