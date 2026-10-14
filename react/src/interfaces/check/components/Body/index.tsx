import React, { memo } from 'react';
import styles from './index.module.css';
import { splitCheckPrice, totalCheckPrice, useCheckStore } from '../../store';

function Body() {
	const records = useCheckStore(state => state.records);
	const rows = [];

	for (let i = 0; i < records.length; i++) {
		const record = records[i];
		rows.push(
			<div className={styles.record} key={record.header + i}>
				<div className={styles.left}>{record.header}</div>
				<div className={styles.right}>{splitCheckPrice(record.price)}$</div>
			</div>,
		);
	}

	return (
		<div className={styles.body}>
			{rows}
			<svg className={styles.totalLine}>
				<line x1="70%" y1="0" x2="100%" y2="0" />
			</svg>
			<div className={styles.total}>
				<span>Итого:</span> {splitCheckPrice(totalCheckPrice(records))}$
			</div>
		</div>
	);
}

export default memo(Body);
