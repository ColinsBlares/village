import React, { memo } from 'react';
import styles from './index.module.css';
import { SHOP_TABS } from '../../catalog';
import { pickCategory, useSupermarketStore } from '../../store';

function Tabs() {
	const categoryId = useSupermarketStore(state => state.categoryId);
	const screen = useSupermarketStore(state => state.screen);

	return (
		<div className={styles.tabs}>
			{SHOP_TABS.map(function (tab) {
				const on = categoryId === tab.id && screen !== 'number';
				const className = on ? styles.on : undefined;
				return (
					<button
						key={tab.id}
						className={className}
						onClick={function () {
							pickCategory(tab.id);
						}}
					>
						{tab.title}
					</button>
				);
			})}
		</div>
	);
}

export default memo(Tabs);
