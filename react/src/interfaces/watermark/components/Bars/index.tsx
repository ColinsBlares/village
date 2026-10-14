import React from 'react';
import styles from './index.module.css';
import { useWatermarkStore } from '../../store';

function Bars() {
	const id = useWatermarkStore(state => state.id);
	const chars = String(id).split('');

	return (
		<React.Fragment>
			{chars.map(function (num, index) {
				return (
					<div
						key={index}
						className={styles.bar}
						style={{ width: Number(num) * 5 + 'px' }}
					/>
				);
			})}
		</React.Fragment>
	);
}

export default React.memo(Bars);
