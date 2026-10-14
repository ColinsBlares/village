import React, { memo, useEffect } from 'react';
import styles from './Craft.module.css';
import { useCraftStore } from '../store';
import { currentItemOf } from '../logic';
import Types from './Types';
import ItemList from './ItemList';
import Queue from './Queue';
import CraftItem from './CraftItem';

function Craft() {
	const viewTick = useCraftStore(state => state.viewTick);
	const crafter = useCraftStore(state => state.crafter);

	useEffect(function () {
		const id = window.setInterval(function () {
			useCraftStore.setState(function (state) {
				return { inventoryTick: state.inventoryTick + 1 };
			});
		}, 1000);
		return function () {
			window.clearInterval(id);
		};
	}, []);

	const opened = !!(crafter && currentItemOf(crafter));

	return (
		<div className={styles.root} data-tick={viewTick}>
			<div className={styles.left}>
				<Types />
				<ItemList />
			</div>
			<div className={styles.right}>{opened ? <CraftItem /> : <Queue />}</div>
		</div>
	);
}

export default memo(Craft);
