import React, { memo } from 'react';
import styles from './index.module.css';
import { SHOP_HEADERS } from '../../catalog';
import { useSupermarketStore } from '../../store';

function Stage() {
	const headerImg = useSupermarketStore(state => state.headerImg);
	const title = useSupermarketStore(state => state.title);
	const image = headerImg ? SHOP_HEADERS[headerImg] : '';

	return (
		<aside className={styles.stage}>
			<div className={styles.d1} />
			<div className={styles.d2} />
			<div className={styles.d3} />
			<div className={styles.logo} style={image ? { backgroundImage: "url('" + image + "')" } : undefined} />
			{headerImg ? null : <div className={styles.title}>{title}</div>}
		</aside>
	);
}

export default memo(Stage);
