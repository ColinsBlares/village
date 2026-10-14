import React, { memo } from 'react';
import styles from './index.module.css';
import { useBugTrackerStore } from '../../store';

function BugView() {
	const bugI = useBugTrackerStore(state => state.bugI);
	const bugList = useBugTrackerStore(state => state.bugList);
	const bug = bugI == -1 ? null : bugList[bugI];

	if (!bug) return null;

	return (
		<div className={styles.bug}>
			<div className={styles.header}>{bug.name}</div>
			<div className={styles.info}>
				<h3>Шаги воспроизведения:</h3>
				<div>
					{bug.steps.map(function (step, index) {
						return <div key={index}>{step}</div>;
					})}
				</div>
				<h3>Результат:</h3>
				<i>{bug.result}</i>
				<h3>Ожидаемый результат:</h3>
				<i>{bug.expectedResult}</i>
			</div>
			<div className={styles.about}>
				<div>Создатель: {bug.author}</div>
				<div>Исполнитель: {bug.executor}</div>
				<div>Состояние: {bug.state}</div>
				<div>Сборка: #{bug.build}</div>
				<div>Дата: {bug.date}</div>
			</div>
		</div>
	);
}

export default memo(BugView);
