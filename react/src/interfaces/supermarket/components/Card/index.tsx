import React, { memo } from 'react';
import styles from './index.module.css';
import { SHOP_ARTS, ShopItem } from '../../catalog';
import { buyItem } from '../../store';

function Card({ item, price }: { item: ShopItem; price: string }) {
	const label = item.action === 'number' ? 'Выбрать' : 'Купить';

	return (
		<article className={styles.card}>
			<div className={styles.name}>{item.name}</div>
			<div className={styles.meta}>{item.meta}</div>
			<div className={styles.art} dangerouslySetInnerHTML={{ __html: SHOP_ARTS[item.art] || '' }} />
			<div className={styles.bottom}>
				<div className={styles.price}>{price}</div>
				<button
					className={styles.buy}
					onClick={function () {
						buyItem(item);
					}}
				>
					{label}
				</button>
			</div>
		</article>
	);
}

export default memo(Card);
