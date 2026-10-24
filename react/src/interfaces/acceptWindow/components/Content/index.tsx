import React from 'react';
import styles from './index.module.css';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { useAcceptWindowStore } from '../../store';

function Content() {
	const text = useAcceptWindowStore(state => state.text);

	return (
		<div
			className={styles.content}
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(text || '') }}
		/>
	);
}

export default React.memo(Content);
