import React from 'react';
import styles from './index.module.css';
import { acceptInput, declineInput, useInputWindowStore } from '../../store';

function LeftWord() {
	const leftWord = useInputWindowStore(state => state.leftWord);

	return (
		<div className={styles.left} onClick={acceptInput}>
			{leftWord}
		</div>
	);
}

function RightWord() {
	const rightWord = useInputWindowStore(state => state.rightWord);

	return (
		<div className={styles.right} onClick={declineInput}>
			{rightWord}
		</div>
	);
}

const LeftView = React.memo(LeftWord);
const RightView = React.memo(RightWord);

function Footer() {
	return (
		<div className={styles.footer}>
			<LeftView />
			<RightView />
		</div>
	);
}

export default React.memo(Footer);
