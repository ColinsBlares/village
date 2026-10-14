import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { SETTINGS_ORDER } from '../../data';
import { cloneSettings, saveSettings, SettingItem, usePlayerMenuStore } from '../../store';
import arrowImg from '@imgs/playerMenu/help-arrow.svg';

function SettingsMain() {
	const active = usePlayerMenuStore(state => state.settingsWindow === 'settings-main');
	const settingsList = usePlayerMenuStore(state => state.settingsList);
	const [localSettings, setLocalSettings] = useState(function () {
		return cloneSettings(usePlayerMenuStore.getState().settingsList);
	});

	let noChanges = true;
	SETTINGS_ORDER.forEach(function (key) {
		if (!localSettings[key] || !settingsList[key]) return;
		if (settingsList[key].value != localSettings[key].value) noChanges = false;
	});

	function step(key: string, direction: number) {
		setLocalSettings(function (prev) {
			const item = prev[key];
			if (!item || !item.pull) return prev;
			const len = item.pull.length;
			let value = item.value;
			if (direction > 0) value = value == len - 1 ? 0 : value + 1;
			else value = value == 0 ? len - 1 : value - 1;
			return {
				...prev,
				[key]: {
					...item,
					value: value,
				},
			};
		});
	}

	function save() {
		if (noChanges) return;
		const remote = usePlayerMenuStore.getState().settingsList;
		const modified: { [key: string]: number } = {};
		SETTINGS_ORDER.forEach(function (key) {
			if (!localSettings[key] || !remote[key]) return;
			if (remote[key].value != localSettings[key].value) {
				modified[key] = localSettings[key].value;
			}
		});
		if (!Object.keys(modified).length) return;
		saveSettings(modified);
	}

	const className = active ? styles.root : styles.root + ' ' + styles.hidden;
	const btnClass = noChanges ? styles.btn + ' ' + styles.disable : styles.btn;

	return (
		<div className={className}>
			<div className={styles.head}>Общие настройки</div>
			<div className={styles.body}>
				{SETTINGS_ORDER.map(function (key) {
					const record: SettingItem = localSettings[key];
					if (!record) return null;
					return (
						<div className={styles.record} key={key}>
							<div className={styles.title}>{record.head}</div>
							{record.type == 'scroll' && record.pull ? (
								<div className={styles.slidebar}>
									<img className={styles.left} src={arrowImg} alt="" onClick={function () { step(key, -1); }} />
									<div className={styles.value}>{record.pull[record.value]}</div>
									<img className={styles.right} src={arrowImg} alt="" onClick={function () { step(key, 1); }} />
								</div>
							) : null}
							{record.type == 'range' ? (
								<div className={styles.val}>
									<input
										type="range"
										min={0}
										value={record.value}
										onChange={function (event) {
											const nextValue = Number(event.target.value);
											setLocalSettings(function (prev) {
												return {
													...prev,
													[key]: {
														...prev[key],
														value: nextValue,
													},
												};
											});
										}}
									/>
								</div>
							) : null}
						</div>
					);
				})}
			</div>
			<div className={btnClass} onClick={save}>
				Сохранить
			</div>
		</div>
	);
}

export default memo(SettingsMain);
