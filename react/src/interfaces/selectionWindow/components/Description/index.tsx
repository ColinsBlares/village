import React from 'react';
import styles from './index.module.css';
import { useSelectionWindowStore } from '../../store';

function Description() {
	const description = useSelectionWindowStore(state => state.description);

	return (
		<div
			className={styles.description}
			dangerouslySetInnerHTML={{ __html: description || '' }}
		/>
	);
}

export default React.memo(Description);
