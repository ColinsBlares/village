import React, { memo } from 'react';
import styles from './index.module.css';
import { useSupermarketStore } from '../../store';

function Heading() {
	const title = useSupermarketStore(state => state.title);

	return (
		<div className={styles.heading}>
			<div className={styles.mark} />
			<div>
				<h1>{title}</h1>
				<p>Выберите товар на полке</p>
			</div>
		</div>
	);
}

export default memo(Heading);
