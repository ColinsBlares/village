import React, { memo } from 'react';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { hideVerification, useMapCaseStore } from '../../store';
import styles from './index.module.css';

function Verification() {
	const verification = useMapCaseStore(state => state.verification);
	if (!verification) return null;

	return (
		<div className={styles.box}>
			<div
				className={styles.message}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(verification.message || '') }}
			/>
			<div className={styles.btns}>
				<div className={styles.btn} onClick={verification.accept}>
					Да
				</div>
				<div className={styles.btn} onClick={hideVerification}>
					Нет
				</div>
			</div>
		</div>
	);
}

export default memo(Verification);
