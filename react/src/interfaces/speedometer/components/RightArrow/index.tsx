import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

const RIGHT_PATH =
	'M13.3045 0.293638C13.1176 0.358615 12.9956 0.510244 12.9956 0.678508L12.9956 5.2428L0.499848 5.2428C0.22394 5.2428 -5.38054e-07 5.42942 -5.28004e-07 5.65934L-2.36691e-07 12.3238C-2.26641e-07 12.5537 0.223941 12.7403 0.499848 12.7403L12.9957 12.7403L12.9957 17.3221C12.9957 17.4904 13.1177 17.642 13.3036 17.707C13.4905 17.7712 13.7055 17.7362 13.8484 17.617L23.8531 9.3073C23.947 9.22901 24 9.12319 24 9.0124C24 8.90162 23.947 8.79579 23.8541 8.7175L13.8494 0.383607C13.7064 0.264467 13.4915 0.228658 13.3045 0.293638Z';

function RightArrow() {
	const rightArrow = useSpeedometerStore(state => state.rightArrow);

	return (
		<div className={styles.rightArrow}>
			<svg className={rightArrow ? styles.green : undefined} viewBox="0 0 24 18" fill="none">
				<path d={RIGHT_PATH} />
			</svg>
		</div>
	);
}

export default memo(RightArrow);
