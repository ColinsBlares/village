import React, { memo } from 'react';
import styles from './index.module.css';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { useHudStore } from '../../store';

function isKeyVisible(name: string, factionId: number) {
	if (name === 'Планшет') {
		return Boolean(factionId && factionId < 8);
	}
	return true;
}

function Keys() {
	const keysShow = useHudStore(state => state.keysShow);
	const selectMenuShow = useHudStore(state => state.selectMenuShow);
	const factionId = useHudStore(state => state.factionId);
	const keys = useHudStore(state => state.keys);

	if (!keysShow || selectMenuShow) {
		return null;
	}

	return (
		<div className={styles.keys}>
			{keys.map(
				item =>
					isKeyVisible(item.name, factionId) && (
						<div key={item.key}>
							<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.key) }} />
							{item.name}
						</div>
					),
			)}
		</div>
	);
}

export default memo(Keys);
