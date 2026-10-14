import React, { memo } from 'react';
import styles from './index.module.css';

function Message({ type, text }: { type: string; text: string }) {
	const typeClass = styles[type] || '';
	const className = typeClass ? styles.row + ' ' + typeClass : styles.row;

	return (
		<div className={className}>
			<p dangerouslySetInnerHTML={{ __html: text }} />
		</div>
	);
}

export default memo(Message);
