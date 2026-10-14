import React, { memo } from 'react';
import styles from './index.module.css';
import { usePlayerMenuStore } from '../../store';

function Coins() {
	const coins = usePlayerMenuStore(state => state.coins);

	return (
		<div className={styles.coins}>
			<div className={styles.logo}>cc</div> {coins}
		</div>
	);
}

export default memo(Coins);
