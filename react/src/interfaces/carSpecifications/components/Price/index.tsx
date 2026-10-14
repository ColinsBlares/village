import React, { memo } from 'react';
import styles from './index.module.css';
import { splitSpecPrice, useCarSpecificationsStore } from '../../store';

function Price() {
	const price = useCarSpecificationsStore(state => state.price);

	return <div className={styles.footer}>${splitSpecPrice(price)}</div>;
}

export default memo(Price);
