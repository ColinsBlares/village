import React, { memo } from 'react';
import styles from './InteractionMenu.module.css';
import { useInteractionMenuStore } from '../store';
import Item from './Item';

function InteractionMenu() {
	const left = useInteractionMenuStore(state => state.left);
	const revision = useInteractionMenuStore(state => state.revision);
	const menu = useInteractionMenuStore(state => state.menu);
	const items = menu && menu.items ? menu.items : [];

	return (
		<div className={styles.root} style={{ left: left + 'vw' }} data-revision={revision}>
			{items.map(function (item, index) {
				return <Item key={index + ':' + item.text} item={item} index={index} />;
			})}
		</div>
	);
}

export default memo(InteractionMenu);
