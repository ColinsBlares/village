import React, { memo, useEffect } from 'react';
import styles from './index.module.css';
import { patchDraft, selectNpc, useNpcEditorStore } from '../../store';
import { triggerMp } from '../../../questEditor/mp';

function Field(props: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className={styles.field}>
			<span>{props.label}</span>
			<input
				type="text"
				value={props.value}
				onChange={function (e) {
					props.onChange(e.target.value);
				}}
			/>
		</label>
	);
}

function NpcEditorView() {
	const show = useNpcEditorStore(state => state.show);
	const npcs = useNpcEditorStore(state => state.npcs);
	const behaviors = useNpcEditorStore(state => state.behaviors);
	const scenarios = useNpcEditorStore(state => state.scenarios);
	const kinds = useNpcEditorStore(state => state.kinds);
	const models = useNpcEditorStore(state => state.models);
	const weapons = useNpcEditorStore(state => state.weapons);
	const anims = useNpcEditorStore(state => state.anims);
	const selectedId = useNpcEditorStore(state => state.selectedId);
	const draft = useNpcEditorStore(state => state.draft);

	useEffect(function () {
		if (!show || !draft) {
			triggerMp('npcs.preview.stop');
			return;
		}
		triggerMp('npcs.preview', draft.model, draft.weapon || '', draft.animDict || '', draft.animName || '');
	}, [show, draft && draft.model, draft && draft.weapon, draft && draft.animDict, draft && draft.animName]);

	if (!show) return null;

	function save(usePos: boolean) {
		if (!draft) return;
		triggerMp(
			'callRemote',
			'npcs.save',
			JSON.stringify({
				id: draft.id,
				key: draft.key,
				name: draft.name,
				model: draft.model,
				behavior: draft.behavior,
				scenario: draft.scenario,
				animDict: draft.animDict,
				animName: draft.animName,
				speed: draft.speed,
				dialog: draft.dialog,
				kind: draft.kind || 'civil',
				weapon: draft.weapon || '',
				ammo: draft.ammo || 0,
				health: draft.health || 200,
				armor: draft.armor || 0,
				aggroRange: draft.aggroRange || 25,
				blip: draft.blip,
				enabled: draft.enabled,
				route: draft.route,
				usePos: usePos,
			}),
		);
	}

	return (
		<div className={styles.root}>
			<div className={styles.list}>
				<div className={styles.title}>NPC</div>
				{npcs.map(npc => (
					<button
						key={npc.id}
						type="button"
						className={npc.id === selectedId ? styles.itemOn : styles.item}
						onClick={function () {
							selectNpc(npc.id);
						}}
					>
						{npc.name}
						<span>{npc.key}</span>
					</button>
				))}
				<button
					type="button"
					className={styles.create}
					onClick={function () {
						triggerMp('callRemote', 'npcs.create', JSON.stringify({ name: 'NPC' }));
					}}
				>
					Создать на моей позиции
				</button>
			</div>
			<div className={styles.form}>
				{draft ? (
					<>
						<Field label="Ключ" value={draft.key} onChange={value => patchDraft('key', value)} />
						<Field label="Имя" value={draft.name} onChange={value => patchDraft('name', value)} />
						<div className={styles.field}>
							<span>Тип</span>
							<div className={styles.choices}>
								{kinds.map(item => (
									<button
										key={item.value}
										type="button"
										className={(draft.kind || 'civil') === item.value ? styles.itemOn : styles.item}
										onClick={function () {
											patchDraft('kind', item.value || 'civil');
										}}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>
						<div className={styles.pickers}>
							<div className={styles.picker}>
								<span>Скин</span>
								{models.map(item => (
									<button
										key={item.id}
										type="button"
										className={draft.model === item.id ? styles.itemOn : styles.item}
										onClick={function () {
											patchDraft('model', item.id || '');
										}}
									>
										{item.label}
									</button>
								))}
							</div>
							<div className={styles.picker}>
								<span>Оружие</span>
								{weapons.map(item => (
									<button
										key={item.id || 'none'}
										type="button"
										className={(draft.weapon || '') === (item.id || '') ? styles.itemOn : styles.item}
										onClick={function () {
											patchDraft('weapon', item.id || '');
											if (item.id && (draft.ammo || 0) <= 0) patchDraft('ammo', 120);
										}}
									>
										{item.label}
									</button>
								))}
							</div>
							<div className={styles.picker}>
								<span>Анимация</span>
								{anims.map(item => (
									<button
										key={item.label}
										type="button"
										className={draft.animDict === (item.dict || '') && draft.animName === (item.name || '') ? styles.itemOn : styles.item}
										onClick={function () {
											patchDraft('animDict', item.dict || '');
											patchDraft('animName', item.name || '');
											if (item.dict) patchDraft('behavior', 'anim');
										}}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>
						<Field label="Патроны" value={String(draft.ammo || 0)} onChange={value => patchDraft('ammo', parseInt(value, 10) || 0)} />
						<Field label="Здоровье" value={String(draft.health || 200)} onChange={value => patchDraft('health', parseInt(value, 10) || 200)} />
						<Field label="Броня" value={String(draft.armor || 0)} onChange={value => patchDraft('armor', parseInt(value, 10) || 0)} />
						<Field label="Дальность агрессии" value={String(draft.aggroRange || 25)} onChange={value => patchDraft('aggroRange', parseFloat(value) || 25)} />
						<div className={styles.field}>
							<span>Поведение</span>
							<div className={styles.choices}>
								{behaviors.map(item => (
									<button
										key={item.value}
										type="button"
										className={draft.behavior === item.value ? styles.itemOn : styles.item}
										onClick={function () {
											patchDraft('behavior', item.value);
										}}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>
						<Field
							label="Сценарий"
							value={draft.scenario}
							onChange={value => patchDraft('scenario', value)}
						/>
						<div className={styles.choices}>
							{scenarios.map(name => (
								<button
									key={name}
									type="button"
									className={styles.item}
									onClick={function () {
										patchDraft('scenario', name);
										patchDraft('behavior', 'scenario');
									}}
								>
									{name}
								</button>
							))}
						</div>
						<Field
							label="Словарь анимации"
							value={draft.animDict}
							onChange={value => patchDraft('animDict', value)}
						/>
						<Field
							label="Название анимации"
							value={draft.animName}
							onChange={value => patchDraft('animName', value)}
						/>
						<Field
							label="Скорость ходьбы"
							value={String(draft.speed)}
							onChange={value => patchDraft('speed', parseFloat(value) || 1)}
						/>
						<label className={styles.field}>
							<span>Реплика без квеста (| между строками)</span>
							<textarea
								value={draft.dialog}
								onChange={function (e) {
									patchDraft('dialog', e.target.value);
								}}
							/>
						</label>
						<label className={styles.check}>
							<input
								type="checkbox"
								checked={draft.enabled}
								onChange={function (e) {
									patchDraft('enabled', e.target.checked);
								}}
							/>
							Включён
						</label>
						<label className={styles.check}>
							<input
								type="checkbox"
								checked={draft.blip}
								onChange={function (e) {
									patchDraft('blip', e.target.checked);
								}}
							/>
							Метка на карте
						</label>
						<div className={styles.route}>
							Точек маршрута: {(draft.route || []).length}
						</div>
						<div className={styles.actions}>
							<button type="button" className={styles.primary} onClick={function () { save(false); }}>
								Сохранить
							</button>
							<button type="button" className={styles.btn} onClick={function () { save(true); }}>
								Поставить сюда
							</button>
							<button
								type="button"
								className={styles.btn}
								onClick={function () {
									triggerMp('callRemote', 'npcs.route.begin', draft.id);
								}}
							>
								Маршрут камерой
							</button>
							<button
								type="button"
								className={styles.btn}
								onClick={function () {
									triggerMp('callRemote', 'npcs.route.clear', draft.id);
								}}
							>
								Очистить маршрут
							</button>
							<button
								type="button"
								className={styles.btn}
								onClick={function () {
									triggerMp('callRemote', 'npcs.delete', draft.id);
								}}
							>
								Удалить
							</button>
						</div>
					</>
				) : (
					<div className={styles.empty}>Создайте NPC на своей позиции</div>
				)}
				<button
					type="button"
					className={styles.btn}
					onClick={function () {
						triggerMp('npcEditor.close');
					}}
				>
					Закрыть
				</button>
			</div>
		</div>
	);
}

export default memo(NpcEditorView);
