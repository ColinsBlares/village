import React from 'react';
import styles from './Prompt.module.css';
import Text from './Text';

function Prompt() {
	return (
		<div id="prompt" className={styles.root}>
			<Text />
		</div>
	);
}

export default React.memo(Prompt);
