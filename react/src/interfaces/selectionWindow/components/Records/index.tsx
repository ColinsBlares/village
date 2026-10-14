import React from 'react';
import styles from './index.module.css';
import { selectRecord, useSelectionWindowStore } from '../../store';

function Record({ index }: { index: number }) {
	const record = useSelectionWindowStore(state => state.records[index]);
	const selected = useSelectionWindowStore(state => state.selected);

	if (!record) {
		return null;
	}

	const className =
		selected === record ? styles.record + ' ' + styles.selected : styles.record;

	return (
		<div className={className} onClick={function () { selectRecord(record); }}>
			{record.text}
		</div>
	);
}

const RecordView = React.memo(Record);

function Records() {
	const length = useSelectionWindowStore(state => state.records.length);
	const items = [];
	for (let i = 0; i < length; i++) {
		items.push(<RecordView key={i} index={i} />);
	}

	return <div className={styles.body}>{items}</div>;
}

export default React.memo(Records);
