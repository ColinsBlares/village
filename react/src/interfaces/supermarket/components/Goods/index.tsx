import React, { memo } from 'react';
import styles from './index.module.css';
import { SHOP_ITEMS, ShopItem, formatPrice, priceOf } from '../../catalog';
import { useSupermarketStore } from '../../store';
import Card from '../Card';

function Goods() {
	const categoryId = useSupermarketStore(state => state.categoryId);
	const prices = useSupermarketStore(state => state.prices);
	const items = categoryId === 'all'
		? SHOP_ITEMS
		: SHOP_ITEMS.filter(function (item: ShopItem) {
			return item.categoryId === categoryId;
		});

	return (
		<div className={styles.grid}>
			{items.map(function (item) {
				return <Card key={item.key} item={item} price={formatPrice(priceOf(prices, item))} />;
			})}
		</div>
	);
}

export default memo(Goods);
