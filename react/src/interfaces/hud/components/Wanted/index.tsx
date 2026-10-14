import React, { memo } from 'react';
import styles from './index.module.css';
import { useHudStore } from '../../store';

const STAR_PATH =
	'M12.9998 0L16.2442 8.4776L25.2082 8.98278L18.2494 14.7274L20.545 23.5172L12.9998 18.59L5.45456 23.5172L7.75015 14.7274L0.791358 8.98278L9.75533 8.4776L12.9998 0Z';

const STARS = [1, 2, 3, 4, 5];

function Wanted() {
	const wanted = useHudStore(state => state.wanted);

	if (wanted <= 0) {
		return null;
	}

	return (
		<div className={styles.wanted}>
			{STARS.map(n => (
				<svg
					key={n}
					className={wanted > 5 - n ? styles.paint : undefined}
					viewBox="0 0 26 24"
				>
					<path d={STAR_PATH} />
				</svg>
			))}
		</div>
	);
}

export default memo(Wanted);
