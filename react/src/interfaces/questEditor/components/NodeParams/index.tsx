import React, { memo, useState, ChangeEvent } from 'react';
import styles from './index.module.css';
import {
	deleteSelectedNode,
	updateNodeData,
	updateSelectedQuest,
	useQuestEditorStore,
} from '../../store';
import { triggerMp } from '../../mp';

function FieldSelect(props: {
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const current = props.options.find(o => o.value === props.value);

	return (
		<div className={styles.select}>
			<button
				type="button"
				className={styles.selectBtn}
				onClick={function () {
					setOpen(!open);
				}}
			>
				{current ? current.label : '—'}
			</button>
			{open ? (
				<div className={styles.selectMenu}>
					{props.options.map(o => (
						<button
							key={o.value || 'empty'}
							type="button"
							className={
								o.value === props.value
									? styles.selectItem + ' ' + styles.selectItemOn
									: styles.selectItem
							}
							onClick={function () {
								props.onChange(o.value);
								setOpen(false);
							}}
						>
							{o.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

function NodeParamsView() {
	const selectedNodeId = useQuestEditorStore(state => state.selectedNodeId);
	const nodes = useQuestEditorStore(state => state.nodes);
	const nodeTypes = useQuestEditorStore(state => state.nodeTypes);
	const signals = useQuestEditorStore(state => state.signals);
	const npcs = useQuestEditorStore(state => state.npcs);

	if (!selectedNodeId) {
		return (
			<div className={styles.panel}>
				<div className={styles.hint}>Выберите ноду на схеме</div>
			</div>
		);
	}

	const node = nodes.find(n => n.id === selectedNodeId);
	if (!node) return null;
	const data = node.data as Record<string, string | number>;
	const nodeType = String(data.nodeType || '');
	const meta = nodeTypes.find(t => t.type === nodeType);
	if (!meta) return null;

	function onField(key: string, e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
		const raw = e.target.value;
		const numKeys = ['x', 'y', 'z', 'radius', 'amount', 'itemId', 'count', 'counterInc', 'counterTarget'];
		const value = numKeys.indexOf(key) !== -1 ? parseFloat(raw) || 0 : raw;
		updateNodeData(selectedNodeId, key, value);
	}

	return (
		<div className={styles.panel}>
			<div className={styles.heading}>{meta.title}</div>
			{meta.params.map(param => {
				if (param.kind === 'npc') {
					const npcOptions = [{ value: '', label: 'Свой пед на шаге' }].concat(
						(npcs || []).map(npc => ({
							value: npc.key,
							label: npc.name + ' (' + npc.key + ')',
						})),
					);
					return (
						<label key={param.key} className={styles.field}>
							<span>{param.label}</span>
							<FieldSelect
								value={String(data[param.key] || '')}
								options={npcOptions}
								onChange={function (value) {
									updateNodeData(selectedNodeId, param.key, value);
								}}
							/>
						</label>
					);
				}
				if (param.kind === 'signal') {
					const signalOptions = [{ value: '', label: '—' }].concat(
						signals.map(s => ({ value: s.name, label: s.label })),
					);
					return (
						<label key={param.key} className={styles.field}>
							<span>{param.label}</span>
							<FieldSelect
								value={String(data[param.key] || '')}
								options={signalOptions}
								onChange={function (value) {
									updateNodeData(selectedNodeId, param.key, value);
								}}
							/>
						</label>
					);
				}
				if (param.kind === 'select' && param.options) {
					return (
						<label key={param.key} className={styles.field}>
							<span>{param.label}</span>
							<FieldSelect
								value={String(data[param.key] || '')}
								options={param.options}
								onChange={function (value) {
									updateNodeData(selectedNodeId, param.key, value);
								}}
							/>
						</label>
					);
				}
				if (param.kind === 'text') {
					return (
						<label key={param.key} className={styles.field}>
							<span>{param.label}</span>
							<textarea
								value={String(data[param.key] || '')}
								onChange={e => onField(param.key, e)}
								rows={3}
							/>
						</label>
					);
				}
				return (
					<label key={param.key} className={styles.field}>
						<span>{param.label}</span>
						<input
							type="text"
							value={String(data[param.key] ?? '')}
							onChange={e => onField(param.key, e)}
						/>
					</label>
				);
			})}
			<button type="button" className={styles.btn} onClick={deleteSelectedNode}>
				Удалить ноду
			</button>
			{nodeType === 'checkpoint' ||
			nodeType === 'mapMarker' ||
			nodeType === 'talkNpc' ? (
				<button
					type="button"
					className={styles.btn}
					onClick={function () {
						triggerMp('quests.editor.requestPosition');
					}}
				>
					Моя позиция
				</button>
			) : null}
		</div>
	);
}

function QuestMetaPanel() {
	const selectedQuestId = useQuestEditorStore(state => state.selectedQuestId);
	const quest = useQuestEditorStore(state =>
		state.quests.find(q => q.id === state.selectedQuestId),
	);
	if (!selectedQuestId || !quest) return null;

	function patch(field: string, value: string | boolean) {
		updateSelectedQuest({ [field]: value });
	}

	return (
		<div className={styles.questMeta}>
			<label className={styles.field}>
				<span>Ключ</span>
				<input
					type="text"
					value={quest.key}
					onChange={e => patch('key', e.target.value)}
				/>
			</label>
			<label className={styles.field}>
				<span>Название</span>
				<input
					type="text"
					value={quest.name}
					onChange={e => patch('name', e.target.value)}
				/>
			</label>
			<label className={styles.field}>
				<span>Описание</span>
				<input
					type="text"
					value={quest.description || ''}
					onChange={e => patch('description', e.target.value)}
				/>
			</label>
			<label className={styles.check}>
				<input
					type="checkbox"
					checked={quest.enabled}
					onChange={e => patch('enabled', e.target.checked)}
				/>
				Включён
			</label>
			<label className={styles.check}>
				<input
					type="checkbox"
					checked={!!quest.repeatable}
					onChange={e => patch('repeatable', e.target.checked)}
				/>
				Можно повторять
			</label>
			<label className={styles.field}>
				<span>Автостарт</span>
				<FieldSelect
					value={quest.autoStart}
					options={[
						{ value: 'none', label: 'Нет' },
						{ value: 'onCreate', label: 'При создании персонажа' },
						{ value: 'onReady', label: 'После условия' },
					]}
					onChange={function (value) {
						patch('autoStart', value);
					}}
				/>
			</label>
			<label className={styles.field}>
				<span>Требует квест (key)</span>
				<input
					type="text"
					value={quest.requireQuest || ''}
					onChange={e => patch('requireQuest', e.target.value)}
				/>
			</label>
		</div>
	);
}

function NodeParams() {
	return (
		<>
			<QuestMetaPanel />
			<NodeParamsView />
		</>
	);
}

export default memo(NodeParams);
