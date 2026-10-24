import React, { memo } from 'react';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { useMapCaseStore } from '../../store';
import styles from './index.module.css';

function Load() {
	const loadMod = useMapCaseStore(state => state.loadMod);
	if (!loadMod) return null;

	const count = loadMod.loadCount % 3;
	const showTime = loadMod.waitingTime >= 0;

	return (
		<div className={styles.load}>
			<div>
				Загрузка {showTime ? <span>({loadMod.waitingTime}с)</span> : null}
			</div>
			<div className={styles.dots}>
				<div className={count === 0 ? styles.focus : undefined}>.</div>
				<div className={count === 1 ? styles.focus : undefined}>.</div>
				<div className={count === 2 ? styles.focus : undefined}>.</div>
			</div>
			<div className={styles.message} dangerouslySetInnerHTML={{ __html: sanitizeHtml(loadMod.message || '') }} />
		</div>
	);
}

export default memo(Load);
