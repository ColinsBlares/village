import React from 'react';
import styles from './index.module.css';
import { useSelectItemsStore } from '../../store';
import handImg from '@imgs/selectItems/hand.svg';

function slotClass(focused: boolean, selected: boolean) {
	let className = styles.container;
	if (focused) {
		className += ' ' + styles.focus;
	}
	if (selected) {
		className += ' ' + styles.select;
	}
	return className;
}

function Wheel() {
	const select = useSelectItemsStore(state => state.select);
	const revision = useSelectItemsStore(state => state.revision);
	const inventory = (window as any).inventory;
	void revision;

	const rings = [];
	const icons = [];
	for (let n = 1; n <= 10; n++) {
		const item = inventory && inventory.hotkeys ? inventory.hotkeys[n - 1] : null;
		const hands =
			inventory && inventory.equipment ? inventory.equipment[13] : null;
		const focused = !!(item && hands && item == hands);
		const selected = n - 1 == select;
		const rotate = 'rotate(' + (n + 1) * 36 + 'deg)';
		const counter = 'rotate(' + (n + 1) * -36 + 'deg)';
		rings.push(
			<g
				key={'ring-' + n}
				className={slotClass(focused, selected)}
				style={{ transform: rotate }}
			>
				<circle className={styles.node} />
				<circle className={styles.stroke} />
			</g>,
		);

		let image = null;
		if (item && inventory.getItem && inventory.getItem(item.sqlId) && n != 1) {
			image = (
				<image
					className={styles.icon}
					xlinkHref={inventory.urlItemImg(item.itemId)}
					style={{ transform: counter }}
				/>
			);
		} else if (n == 1) {
			image = (
				<image
					className={styles.icon + ' ' + styles.hand}
					xlinkHref={handImg}
					style={{ transform: counter }}
				/>
			);
		}
		icons.push(
			<g key={'icon-' + n} className={styles.container} style={{ transform: rotate }}>
				{image}
			</g>,
		);
	}

	return (
		<svg>
			<linearGradient id="select-items-gradient" x1="0%" y1="23%" x2="100%" y2="50%">
				<stop offset="85%" stopColor="#rgba(12, 12, 12, 0.6)" />
				<stop offset="100%" stopColor="rgba(255, 223, 41, 0.6)" />
			</linearGradient>
			<circle className={styles.center} />
			{rings}
			{icons}
		</svg>
	);
}

export default React.memo(Wheel);
