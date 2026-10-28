import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { findTradeItem } from '../../../trade/store';
import { cx } from '../../cx';
import { getDescParams, getEnvironmentItem, getItem, getItemName, getItemsCount, itemStyle } from '../../model';
import { useInventoryStore } from '../../store';
import ContentsPreview from '../ContentsPreview';
import styles from './index.module.css';

function ItemDesc() {
	const desc = useInventoryStore(function (store) {
		return store.itemDesc;
	});
	const menuItem = useInventoryStore(function (store) {
		return store.itemMenu.item;
	});
	const dragItem = useInventoryStore(function (store) {
		return store.dragItem;
	});
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	const equipment = useInventoryStore(function (store) {
		return store.equipment;
	});
	const environment = useInventoryStore(function (store) {
		return store.environment;
	});
	const debug = useInventoryStore(function (store) {
		return store.debug;
	});
	const [holdShift, setHoldShift] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const item = desc.item;
	const shown = !item || menuItem || dragItem ? null : getItem(item.sqlId) || getEnvironmentItem(item.sqlId) || findTradeItem(item.sqlId);
	const contents = getItemsCount(shown);
	const showContents = holdShift && contents > 0;

	useEffect(function () {
		function onKeyDown(e: KeyboardEvent) {
			if (e.repeat) return;
			if (e.key === 'Shift' || e.keyCode === 16) setHoldShift(true);
		}
		function onKeyUp(e: KeyboardEvent) {
			if (e.key === 'Shift' || e.keyCode === 16) setHoldShift(false);
		}
		function onBlur() {
			setHoldShift(false);
		}
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		return function () {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, []);

	useLayoutEffect(function () {
		const el = rootRef.current;
		if (!el) return;
		el.style.transform = '';
		const rect = el.getBoundingClientRect();
		const pad = 8;
		let dx = 0;
		let dy = 0;
		if (rect.right > window.innerWidth - pad) dx = window.innerWidth - pad - rect.right;
		if (rect.bottom > window.innerHeight - pad) dy = window.innerHeight - pad - rect.bottom;
		if (rect.left + dx < pad) dx = pad - rect.left;
		if (rect.top + dy < pad) dy = pad - rect.top;
		if (dx || dy) el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
	}, [desc.x, desc.y, showContents, item]);

	if (!shown) return null;
	const info = itemsInfo[shown.itemId];
	const params = getDescParams(shown);

	return (
		<div
			ref={rootRef}
			className={cx(styles.desc, showContents && styles.open, 'inv-item-desc')}
			style={{ left: desc.x + 'px', top: desc.y + 'px' }}
		>
			<div className={styles.title}>{getItemName(shown)}</div>
			{debug ? <div>itemId: #{shown.itemId}</div> : null}
			{contents > 0 ? (
				<ContentsPreview item={shown} open={holdShift} equipment={equipment} environment={environment} />
			) : null}
			{showContents ? null : (
				<div className={styles.preview + ' inv-item'} style={itemStyle(shown)}>
					{debug ? <div className={styles.sqlid}>#{shown.sqlId}</div> : null}
					{shown.params && shown.params.count ? <div className={styles.count}>{shown.params.count}</div> : null}
				</div>
			)}
			<div className={styles.description}>{info ? info.description : ''}</div>
			<div className={styles.params}>
				{params.map(function (param) {
					return (
						<div className={styles.param} key={param.name}>
							<div className={styles.name}>{param.name}</div>
							<div className={styles.value}>{param.value}</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(ItemDesc);
