import React, { memo } from 'react';
import styles from './index.module.css';
import { useQuestLogStore, QuestLogItem } from '../../store';
import { triggerMp } from '../../../questEditor/mp';

function Row(props: { item: QuestLogItem; done?: boolean }) {
	const item = props.item;
	return (
		<div className={styles.row}>
			<div className={styles.name}>{item.name}</div>
			<div className={styles.objective}>
				{props.done ? item.description || 'Выполнен' : item.objective || item.description}
			</div>
			{props.done ? null : (
				<div className={styles.actions}>
					<button
						type="button"
						className={item.tracked ? styles.btnOn : styles.btn}
						onClick={function () {
							triggerMp('callRemote', 'quests.track', item.key);
						}}
					>
						{item.tracked ? 'В трекере' : 'Отслеживать'}
					</button>
					<button
						type="button"
						className={styles.btn}
						onClick={function () {
							triggerMp('callRemote', 'quests.abandon', item.key);
						}}
					>
						Отказаться
					</button>
				</div>
			)}
		</div>
	);
}

function QuestLogView() {
	const show = useQuestLogStore(state => state.show);
	const active = useQuestLogStore(state => state.active);
	const done = useQuestLogStore(state => state.done);
	if (!show) return null;

	return (
		<div className={styles.root}>
			<div className={styles.panel}>
				<div className={styles.head}>
					<span>Квесты</span>
					<button
						type="button"
						className={styles.close}
						onClick={function () {
							triggerMp('quests.log.close');
						}}
					>
						Закрыть
					</button>
				</div>
				<div className={styles.section}>Активные</div>
				{active.length ? (
					active.map(item => <Row key={item.key} item={item} />)
				) : (
					<div className={styles.empty}>Нет активных квестов</div>
				)}
				<div className={styles.section}>Сданные</div>
				{done.length ? (
					done.map(item => <Row key={item.key} item={item} done />)
				) : (
					<div className={styles.empty}>Пока пусто</div>
				)}
			</div>
		</div>
	);
}

export default memo(QuestLogView);
