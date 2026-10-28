import React from 'react';
import styles from './index.module.css';
import { SHOW_TIME, useOfferDialogStore } from '../../store';

function Progress() {
	const openedAt = useOfferDialogStore(state => state.openedAt);

	return (
		<div className={styles.track}>
			<div
				key={openedAt}
				className={styles.fill}
				style={{ animationDuration: SHOW_TIME + 'ms' }}
			/>
		</div>
	);
}

export default React.memo(Progress);
