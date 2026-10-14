import React, { memo } from 'react';
import styles from './index.module.css';
import { onClickBug, useBugTrackerStore } from '../../store';

function BugList() {
	const score = useBugTrackerStore(state => state.score);
	const bugList = useBugTrackerStore(state => state.bugList);
	const bugI = useBugTrackerStore(state => state.bugI);

	return (
		<div className={styles.left}>
			<div className={styles.title}>Очки помощи: {score}</div>
			{bugList.length ? (
				<div className={styles.list}>
					{bugList.map(function (bug, index) {
						const className = index == bugI ? styles.item + ' ' + styles.active : styles.item;
						return (
							<div
								key={index}
								className={className}
								onClick={function () {
									onClickBug(index);
								}}
							>
								{bug.name}
							</div>
						);
					})}
				</div>
			) : (
				<div>Список пуст</div>
			)}
		</div>
	);
}

export default memo(BugList);
