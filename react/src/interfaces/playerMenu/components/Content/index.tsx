import React, { memo } from 'react';
import styles from './index.module.css';
import { usePlayerMenuStore } from '../../store';
import Header from '../Header';
import Body from '../Body';

function Content() {
	const blurred = usePlayerMenuStore(state => state.confirmation != null);
	const className = blurred ? styles.content + ' ' + styles.blur : styles.content;

	return (
		<div className={className}>
			<Header />
			<Body />
		</div>
	);
}

export default memo(Content);
