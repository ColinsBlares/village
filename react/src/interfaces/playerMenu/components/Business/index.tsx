import React, { memo } from 'react';
import styles from './index.module.css';
import { formatRecordValue, usePlayerMenuStore } from '../../store';

function Business() {
	const businessInfo = usePlayerMenuStore(state => state.businessInfo);
	const empty = !businessInfo.length;
	const bodyClass = empty ? styles.body + ' ' + styles.no : styles.body;

	return (
		<div className={styles.block}>
			<div className={styles.header}>Бизнес</div>
			<div className={bodyClass}>
				{businessInfo.map(function (record) {
					return (
						<div className={styles.record} key={record.head}>
							<div>{record.head}</div>
							<div style={record.color ? { color: record.color } : undefined}>
								<span>{formatRecordValue(record)}</span>
							</div>
						</div>
					);
				})}
				{empty ? <div className={styles.info}>He приобретён</div> : null}
			</div>
		</div>
	);
}

export default memo(Business);
