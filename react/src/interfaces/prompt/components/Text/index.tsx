import React from 'react';
import styles from './index.module.css';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { usePromptStore } from '../../store';

function Text() {
	const text = usePromptStore(state => state.text);

	return (
		<div
			className={styles.text}
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(text || '') }}
		/>
	);
}

export default React.memo(Text);
