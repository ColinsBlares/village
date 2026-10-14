import React, { memo } from 'react';
import styles from './index.module.css';
import { ChangelistState, shiftIndex, useChangelistStore } from '../../store';

function selectDate(state: ChangelistState) {
	const entry = state.list[state.i];
	return entry ? entry.date : '';
}

function Header() {
	const index = useChangelistStore(state => state.i);
	const length = useChangelistStore(state => state.list.length);
	const date = useChangelistStore(selectDate);
	const titleClass =
		index === length - 1 ? styles.title + ' ' + styles.first : styles.title;
	let dateClass = styles.date;

	if (!index) {
		dateClass = styles.date + ' ' + styles.right;
	} else if (index < length - 1) {
		dateClass = styles.date + ' ' + styles.center;
	}

	return (
		<div className={styles.header}>
			{index < length - 1 ? (
				<i
					className={styles.arrow + ' fas fa-long-arrow-alt-left'}
					onClick={function () {
						shiftIndex(1);
					}}
				/>
			) : null}
			<div className={titleClass}>
				<div className={styles.name}>Обновления #{index + 1}</div>
				<div className={dateClass}>{date}</div>
			</div>
			{index > 0 ? (
				<i
					className={styles.arrow + ' fas fa-long-arrow-alt-right'}
					onClick={function () {
						shiftIndex(-1);
					}}
				/>
			) : null}
		</div>
	);
}

export default memo(Header);
