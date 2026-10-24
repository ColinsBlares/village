import React from 'react';
import styles from './index.module.css';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { useSelectionWindowStore } from '../../store';

function Description() {
	const description = useSelectionWindowStore(state => state.description);

	return (
		<div
			className={styles.description}
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(description || '') }}
		/>
	);
}

export default React.memo(Description);
