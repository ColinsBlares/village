import React, { memo } from 'react';
import styles from './index.module.css';
import { useSelectMenuStore } from '../../store';

function Loader() {
	const loader = useSelectMenuStore(state => state.loader);
	if (!loader) return null;

	return (
		<div className={styles.loader}>
			<div className={styles.rolling}>
				<div className={styles.spin} />
			</div>
		</div>
	);
}

export default memo(Loader);
