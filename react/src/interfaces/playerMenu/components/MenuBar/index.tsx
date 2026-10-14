import React, { memo } from 'react';
import styles from './index.module.css';
import { MENU_ITEMS } from '../../data';
import { setWindow, usePlayerMenuStore } from '../../store';

function MenuBar() {
	const windowId = usePlayerMenuStore(state => state.windowId);

	return (
		<div className={styles.bar}>
			{MENU_ITEMS.map(function (item) {
				const className = item.window === windowId ? styles.item + ' ' + styles.focus : styles.item;
				return (
					<div key={item.window} className={className} onClick={function () { setWindow(item.window); }}>
						{item.head}
					</div>
				);
			})}
		</div>
	);
}

export default memo(MenuBar);
