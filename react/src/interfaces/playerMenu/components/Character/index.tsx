import React, { memo } from 'react';
import styles from './index.module.css';
import Statistics from '../Statistics';
import House from '../House';
import Business from '../Business';
import Skills from '../Skills';

function Character() {
	return (
		<div className={styles.character}>
			<Statistics />
			<House />
			<Business />
			<Skills />
		</div>
	);
}

export default memo(Character);
