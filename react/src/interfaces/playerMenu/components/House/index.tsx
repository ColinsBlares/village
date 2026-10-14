import React, { memo } from 'react';
import styles from './index.module.css';
import { formatRecordValue, InfoRecord, usePlayerMenuStore } from '../../store';

function Records(props: { title: string; records: InfoRecord[] }) {
	const empty = !props.records.length;
	const bodyClass = empty ? styles.body + ' ' + styles.no : styles.body;

	return (
		<div className={styles.block}>
			<div className={styles.header}>{props.title}</div>
			<div className={bodyClass}>
				{props.records.map(function (record) {
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

const RecordsView = memo(Records);

function House() {
	const houseInfo = usePlayerMenuStore(state => state.houseInfo);
	return <RecordsView title="Дом" records={houseInfo} />;
}

export default memo(House);
