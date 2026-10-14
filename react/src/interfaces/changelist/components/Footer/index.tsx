import React, { memo } from 'react';
import styles from './index.module.css';
import Build from '../Build';
import Likes from '../Likes';

function Footer() {
	return (
		<div className={styles.footer}>
			<Build />
			<Likes />
		</div>
	);
}

export default memo(Footer);
