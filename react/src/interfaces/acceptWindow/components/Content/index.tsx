import React from 'react';
import styles from './index.module.css';
import { useAcceptWindowStore } from '../../store';

function Content() {
	const text = useAcceptWindowStore(state => state.text);

	return (
		<div
			className={styles.content}
			dangerouslySetInnerHTML={{ __html: text || '' }}
		/>
	);
}

export default React.memo(Content);
