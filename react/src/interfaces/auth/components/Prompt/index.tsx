import React, { memo } from 'react';
import styles from './index.module.css';
import { useAuthStore } from '../../store';

function Prompt() {
	const prompt = useAuthStore(state => state.prompt);

	if (!prompt) {
		return null;
	}

	return <div className={styles.prompt}>{prompt}</div>;
}

export default memo(Prompt);
