import React from 'react';
import styles from './SelectItems.module.css';
import { useSelectItemsStore } from '../store';
import Wheel from './Wheel';
import Description from './Description';

function SelectItems() {
	const inventoryVisible = useSelectItemsStore(state => state.inventoryVisible);

	if (!inventoryVisible) {
		return null;
	}

	return (
		<div id="selectItems" className={styles.root}>
			<Wheel />
			<Description />
		</div>
	);
}

export default React.memo(SelectItems);
