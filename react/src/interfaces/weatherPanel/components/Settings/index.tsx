import React, { memo, useEffect, useState } from 'react';
import styles from './index.module.css';
import { SettingField, useWeatherPanelStore } from '../../store';
import { send } from '../../mp';

function NumberField(props: { field: SettingField; value: number }) {
	const [text, setText] = useState(String(props.value));

	useEffect(function () {
		setText(String(props.value));
	}, [props.value]);

	function commit() {
		const number = Number(text);
		if (!isFinite(number)) {
			setText(String(props.value));
			return;
		}
		send('settings', { key: props.field.key, value: number });
	}

	return (
		<input
			type="number"
			min={props.field.min}
			max={props.field.max}
			step={props.field.step || 1}
			value={text}
			onChange={function (event) {
				setText(event.target.value);
			}}
			onBlur={commit}
			onKeyDown={function (event) {
				if (event.key === 'Enter') commit();
			}}
		/>
	);
}

function Settings() {
	const schema = useWeatherPanelStore(state => state.settingSchema);
	const settings = useWeatherPanelStore(state => state.settings);
	const [query, setQuery] = useState('');
	const needle = query.trim().toLowerCase();
	const fields = schema.filter(function (field) {
		if (!needle) return true;
		return field.label.toLowerCase().indexOf(needle) !== -1 || field.group.toLowerCase().indexOf(needle) !== -1;
	});
	const groups: string[] = [];
	fields.forEach(function (field) {
		if (groups.indexOf(field.group) === -1) groups.push(field.group);
	});

	return (
		<div>
			<input
				className={styles.search}
				placeholder="Найти настройку"
				value={query}
				onChange={function (event) {
					setQuery(event.target.value);
				}}
			/>
			{groups.length === 0 ? <p className={styles.empty}>Ничего не нашлось</p> : null}
			{groups.map(function (group) {
				const rows = fields.filter(function (field) { return field.group === group; });
				return (
					<section className={styles.group} key={group}>
						<h3>{group}</h3>
						{rows.map(function (field) {
							const value = settings[field.key];
							return (
								<label className={styles.row} key={field.key}>
									<span>{field.label}</span>
									{field.type === 'bool' ? (
										<input
											type="checkbox"
											checked={!!value}
											onChange={function (event) {
												send('settings', { key: field.key, value: event.target.checked });
											}}
										/>
									) : (
										<NumberField field={field} value={Number(value) || 0} />
									)}
								</label>
							);
						})}
					</section>
				);
			})}
		</div>
	);
}

export default memo(Settings);
