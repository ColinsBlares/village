import React, { memo } from 'react';
import styles from './index.module.css';
import { triggerMp } from '../../mp';

const TABS = [
	{ id: 'overview', label: 'Обзор' },
	{ id: 'zones', label: 'Зоны' },
	{ id: 'time', label: 'Время' },
	{ id: 'events', label: 'События' },
	{ id: 'settings', label: 'Настройки' },
];

function Rail(props: { tab: string; onTab: (tab: string) => void }) {
	return (
		<nav className={styles.rail}>
			<p className={styles.mark}>НЕБО</p>
			{TABS.map(function (item) {
				const on = item.id === props.tab;
				return (
					<button
						key={item.id}
						type="button"
						className={on ? styles.tabOn : styles.tab}
						onClick={function () {
							props.onTab(item.id);
						}}
					>
						{item.label}
					</button>
				);
			})}
			<button
				type="button"
				className={styles.close}
				onClick={function () {
					triggerMp('weatherPanel.close');
				}}
			>
				Закрыть
			</button>
		</nav>
	);
}

export default memo(Rail);
