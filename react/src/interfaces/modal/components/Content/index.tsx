import React from 'react';
import styles from './index.module.css';
import { sanitizeHtml } from '@utils/sanitizeHtml';
import { useModalStore } from '../../store';

function Content() {
	const activeName = useModalStore(state => state.activeName);
	const content = useModalStore(state =>
		activeName && state.modals[activeName] ? state.modals[activeName].content : '',
	);

	return (
		<div
			className={styles.content}
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(content || '') }}
		/>
	);
}

export default React.memo(Content);
