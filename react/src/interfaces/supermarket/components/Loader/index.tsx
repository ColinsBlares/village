import React, { memo } from 'react';
import styles from './index.module.css';
import { useSupermarketStore } from '../../store';

function Loader() {
	const loader = useSupermarketStore(state => state.loader);
	if (!loader) return null;
	return (
		<div className={styles.loader}>
			<div />
		</div>
	);
}

export default memo(Loader);
