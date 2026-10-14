import React from 'react';
import styles from './index.module.css';
import { prettyInfoValue, useInfoTableStore } from '../../store';

function Row({ index }: { index: number }) {
	const name = useInfoTableStore(state => state.name);
	const param = useInfoTableStore(state => {
		const table = state.tables[name];
		return table ? table.params[index] : null;
	});

	if (!param) {
		return null;
	}

	let valueClass = '';
	if (param.value == 0) {
		valueClass = styles.empty;
	} else if (param.value == 100) {
		valueClass = styles.fullValue;
	}

	const fillClass = param.value == 100 ? styles.fill + ' ' + styles.full : styles.fill;

	return (
		<div className={styles.row}>
			<div className={styles.param}>
				<div>{param.key}</div>
				<div className={valueClass}>{prettyInfoValue(param)}</div>
			</div>
			{param.isProgress ? (
				<div className={styles.progress}>
					<div className={fillClass} style={{ width: param.value + '%' }} />
				</div>
			) : null}
		</div>
	);
}

const RowView = React.memo(Row);

function Rows() {
	const name = useInfoTableStore(state => state.name);
	const length = useInfoTableStore(state =>
		state.tables[name] ? state.tables[name].params.length : 0,
	);
	const items = [];
	for (let i = 0; i < length; i++) {
		items.push(<RowView key={i} index={i} />);
	}

	return <div className={styles.content}>{items}</div>;
}

export default React.memo(Rows);
