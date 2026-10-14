import React, { memo } from 'react';
import styles from './index.module.css';
import Features from '../Features';
import Fixed from '../Fixed';
import Improvements from '../Improvements';
import Removed from '../Removed';

function Content() {
	return (
		<div className={styles.content}>
			<Features />
			<Fixed />
			<Improvements />
			<Removed />
		</div>
	);
}

export default memo(Content);
