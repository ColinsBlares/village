import React, { memo } from 'react';
import styles from './index.module.css';
import { showChangelist, useAuthStore } from '../../store';

function Updates() {
	const updates = useAuthStore(state => state.updates);

	return (
		<div className={styles.updates}>
			<h3 className={styles.header}>Обновления сервера</h3>
			<div className={styles.list}>
				{updates.map(function (update, i) {
					const number = updates.length - i;
					return (
						<div
							key={number}
							onClick={function () {
								showChangelist(updates.length - i - 1);
							}}
						>
							<div className={styles.date}>{update.date}</div>
							<div className={styles.title}>Обновления #{number}</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(Updates);
