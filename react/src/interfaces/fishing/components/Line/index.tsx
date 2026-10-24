import React, { memo } from 'react';
import styles from './index.module.css';
import { useFishingStore } from '../../store';

function Line() {
	const isFetch = useFishingStore(state => state.isFetch);
	const zone = useFishingStore(state => state.zone);
	const position = useFishingStore(state => state.position);
	const inZone = zone != null
		&& Math.abs(position + 3 - 50) < parseInt(String(zone / 2), 10);

	if (!isFetch || zone == null) return null;

	return (
		<div
			className={[styles.line, inZone ? styles.lineActive : ''].join(' ')}
			role="img"
			aria-label={inZone ? 'Поплавок в зоне поклёвки' : 'Дождитесь попадания поплавка в зону'}
		>
			<div
				className={styles.zone}
				style={{ width: zone + '%', left: (100 - zone) / 2 + '%' }}
			/>
			{[25, 50, 75].map(tick => (
				<span key={tick} className={styles.tick} style={{ left: tick + '%' }} />
			))}
			<div className={styles.cursor} style={{ left: position + 3 + '%' }}>
				<span className={styles.bobber} />
			</div>
		</div>
	);
}

export default memo(Line);
