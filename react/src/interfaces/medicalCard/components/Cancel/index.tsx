import React, { memo } from 'react';
import styles from './index.module.css';
import { hideMedicalCard } from '../../store';

function Cancel() {
	return (
		<div className={styles.cancel} onClick={hideMedicalCard}>
			<svg viewBox="0 0 11 11" fill="none">
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M6.80758 5.49954L10.7295 1.57763C11.0905 1.21661 11.0905 0.63129 10.7295 0.270326C10.3685 -0.0906907 9.78321 -0.0906907 9.42219 0.270326L5.50023 4.19229L1.57827 0.270274C1.21725 -0.0907424 0.631984 -0.0907424 0.270968 0.270274C-0.089997 0.63129 -0.089997 1.21661 0.270968 1.57758L4.19293 5.49949L0.270968 9.42145C-0.089997 9.78246 -0.089997 10.3678 0.270968 10.7287C0.631984 11.0898 1.21725 11.0898 1.57827 10.7287L5.50023 6.80679L9.42219 10.7287C9.78315 11.0898 10.3685 11.0898 10.7295 10.7287C11.0905 10.3677 11.0905 9.78246 10.7295 9.42145L6.80758 5.49954Z"
					fill="white"
				/>
			</svg>
		</div>
	);
}

export default memo(Cancel);
