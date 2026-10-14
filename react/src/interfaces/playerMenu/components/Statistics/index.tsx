import React, { memo } from 'react';
import styles from './index.module.css';
import { formatRecordValue, openFamilyControl, usePlayerMenuStore } from '../../store';

function Statistics() {
	const statistics = usePlayerMenuStore(state => state.statistics);
	const familyId = usePlayerMenuStore(state => state.familyId);
	const keys = Object.keys(statistics);

	return (
		<div className={styles.statistics}>
			<div className={styles.header}>Статистика</div>
			<div className={styles.body}>
				{keys.map(function (key) {
					const record = statistics[key];
					return (
						<div className={styles.record} key={key}>
							<div>{record.head}</div>
							<div style={record.color ? { color: record.color } : undefined}>
								<span>{formatRecordValue(record)}</span>
							</div>
						</div>
					);
				})}
				{familyId ? (
					<div className={styles.family} onClick={openFamilyControl}>
						Управление семьёй
					</div>
				) : null}
			</div>
		</div>
	);
}

export default memo(Statistics);
