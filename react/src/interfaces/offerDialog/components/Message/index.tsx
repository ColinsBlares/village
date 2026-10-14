import React from 'react';
import styles from './index.module.css';
import { useOfferDialogStore } from '../../store';

function Message() {
	const text = useOfferDialogStore(state => state.text);

	return (
		<div className={styles.content}>
			<div
				className={styles.message}
				dangerouslySetInnerHTML={{ __html: text }}
			/>
		</div>
	);
}

export default React.memo(Message);
