import React, { memo } from 'react';
import styles from './index.module.css';
import { getPaddingNumber } from '@utils/cefBridge';
import { useCharacterPassStore } from '../../store';

function NumberView() {
	const number = useCharacterPassStore(state => state.number);

	return <div className={styles.number}>{getPaddingNumber(number, 10)}</div>;
}

export default memo(NumberView);
