import React, { memo } from 'react';
import styles from './CarSpecifications.module.css';
import Header from './Header';
import Specs from './Specs';
import Price from './Price';

function CarSpecifications() {
	return (
		<div className={styles.root}>
			<Header />
			<Specs />
			<Price />
		</div>
	);
}

export default memo(CarSpecifications);
