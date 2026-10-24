import React, { memo, useState } from 'react';
import styles from './index.module.css';
import FlowCanvas from '../FlowCanvas';
import NodeParams from '../NodeParams';
import {
	addNodeFromPalette,
	buildSavePayload,
	selectQuest,
	useQuestEditorStore,
} from '../../store';
import { triggerMp } from '../../mp';

const CATEGORY: Record<string, string> = {
	flow: 'Сценарий',
	world: 'Мир',
	wait: 'Ожидание',
	action: 'Действия',
};

function Sidebar() {
	const quests = useQuestEditorStore(state => state.quests);
	const selectedQuestId = useQuestEditorStore(state => state.selectedQuestId);
	const nodeTypes = useQuestEditorStore(state => state.nodeTypes);
	const [draftName, setDraftName] = useState('Новый квест');
	const [draftKey, setDraftKey] = useState('');

	const byCategory: Record<string, typeof nodeTypes> = {};
	nodeTypes.forEach(t => {
		if (!byCategory[t.category]) byCategory[t.category] = [];
		byCategory[t.category].push(t);
	});

	return (
		<div className={styles.sidebar}>
			<div className={styles.section}>
				<div className={styles.sectionTitle}>Квесты</div>
				{quests.map(q => (
					<button
						key={q.id}
						type="button"
						className={
							styles.questItem +
							(q.id === selectedQuestId ? ' ' + styles.active : '')
						}
						onClick={function () {
							selectQuest(q.id);
						}}
					>
						{q.name}
						<span className={styles.questKey}>{q.key}</span>
					</button>
				))}
				<input
					className={styles.draft}
					type="text"
					value={draftName}
					placeholder="Название"
					onChange={function (e) {
						setDraftName(e.target.value);
					}}
				/>
				<input
					className={styles.draft}
					type="text"
					value={draftKey}
					placeholder="key"
					onChange={function (e) {
						setDraftKey(e.target.value);
					}}
				/>
				<button
					type="button"
					className={styles.smallBtn}
					onClick={function () {
						triggerMp(
							'callRemote',
							'questEditor.create',
							JSON.stringify({ name: draftName, key: draftKey }),
						);
					}}
				>
					Создать квест
				</button>
			</div>
			<div className={styles.section}>
				<div className={styles.sectionTitle}>Ноды</div>
				{Object.keys(byCategory).map(cat => (
					<div key={cat}>
						<div className={styles.cat}>{CATEGORY[cat] || cat}</div>
						{byCategory[cat].map(meta => (
							<button
								key={meta.type}
								type="button"
								className={styles.nodeBtn}
								onClick={function () {
									addNodeFromPalette(meta.type, meta);
								}}
							>
								{meta.title}
							</button>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function Toolbar() {
	const quest = useQuestEditorStore(state =>
		state.quests.find(q => q.id === state.selectedQuestId),
	);

	function save() {
		const payload = buildSavePayload();
		if (!payload) return;
		triggerMp('callRemote', 'questEditor.save', JSON.stringify(payload));
	}

	return (
		<div className={styles.toolbar}>
			<span className={styles.toolbarTitle}>Редактор квестов</span>
			<div className={styles.toolbarActions}>
				<button type="button" className={styles.action} onClick={save}>
					Сохранить
				</button>
				{quest ? (
					<>
						<button
							type="button"
							className={styles.action}
							onClick={function () {
								triggerMp('callRemote', 'questEditor.assignSelf', quest.key);
							}}
						>
							Выдать себе
						</button>
						<button
							type="button"
							className={styles.actionMuted}
							onClick={function () {
								triggerMp('callRemote', 'questEditor.duplicate', quest.id);
							}}
						>
							Копия
						</button>
						<button
							type="button"
							className={styles.actionMuted}
							onClick={function () {
								triggerMp('callRemote', 'questEditor.resetSelf', quest.key);
							}}
						>
							Сбросить себе
						</button>
						<button
							type="button"
							className={styles.actionMuted}
							onClick={function () {
								triggerMp('callRemote', 'questEditor.delete', quest.id);
							}}
						>
							Удалить квест
						</button>
					</>
				) : null}
				<button
					type="button"
					className={styles.actionMuted}
					onClick={function () {
						triggerMp('questEditor.close');
					}}
				>
					Закрыть
				</button>
			</div>
		</div>
	);
}

function QuestEditorView() {
	const show = useQuestEditorStore(state => state.show);
	if (!show) return null;

	return (
		<div className={styles.root}>
			<Toolbar />
			<div className={styles.body}>
				<Sidebar />
				<FlowCanvas />
				<div className={styles.right}>
					<NodeParams />
				</div>
			</div>
		</div>
	);
}

export default memo(QuestEditorView);
