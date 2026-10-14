import React, { memo } from 'react';
import styles from './index.module.css';
import { InteractionMenuItem } from '../../menus';
import { interactionIcon } from '../../icons';
import { onClickItem } from '../../store';

function Item({ item, index }: { item: InteractionMenuItem; index: number }) {
	const icon = interactionIcon(item.icon || 'default.svg');

	return (
		<div
			className={styles.item}
			onClick={function () {
				onClickItem(index);
			}}
		>
			<div className={styles.icon}>
				<img src={icon} alt="" />
			</div>
			<div className={styles.text}>{item.text}</div>
		</div>
	);
}

export default memo(Item);
