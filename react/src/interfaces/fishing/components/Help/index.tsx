import React, { memo } from 'react';
import styles from './index.module.css';
import { endFishing, useFishingStore } from '../../store';

function Help() {
	const isStarted = useFishingStore(state => state.isStarted);
	const isFetch = useFishingStore(state => state.isFetch);

	return (
		<div className={styles.help}>
			{!isStarted ? (
				<div className={styles.action}>
					<span className={styles.button}>ЛКМ</span>
					<span>Забросить</span>
				</div>
			) : null}
			{isFetch ? (
				<div className={styles.action}>
					<button className={styles.button} type="button" onClick={endFishing}>
						Space
					</button>
					<span>Подсечь</span>
				</div>
			) : null}
			{!isFetch ? (
				<div className={styles.action}>
					<span className={styles.button}>Esc</span>
					<span>Выйти</span>
				</div>
			) : null}
		</div>
	);
}

export default memo(Help);
