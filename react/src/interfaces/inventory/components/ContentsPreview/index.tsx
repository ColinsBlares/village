import React, { memo } from 'react';
import { urlItemImg } from '../../images';
import { getItemName, indexToXY, itemGradient } from '../../model';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

type ContentsPreviewProps = {
	item: any;
	open: boolean;
	equipment: any;
	environment: any;
};

const MAX_WIDTH_VH = 31.5;
const MAX_HEIGHT_VH = 28;
const CELL_VH = 2.2;

function visiblePockets(item: any) {
	if (!item || !item.pockets) return [];
	const pockets = [];
	for (let i = 0; i < item.pockets.length; i++) {
		const pocket = item.pockets[i];
		if (!pocket || pocket.search) continue;
		pockets.push(pocket);
	}
	return pockets;
}

function hasVisibleItems(pockets: any[]) {
	for (let i = 0; i < pockets.length; i++) {
		const items = pockets[i].items || {};
		for (const key in items) {
			if (items[key] && !items[key].search) return true;
		}
	}
	return false;
}

function cellSize(pockets: any[]) {
	let cols = 1;
	let rows = 0;
	for (let i = 0; i < pockets.length; i++) {
		if (pockets[i].cols > cols) cols = pockets[i].cols;
		rows += pockets[i].rows || 1;
	}
	if (!rows) rows = 1;
	const byWidth = MAX_WIDTH_VH / cols;
	const byHeight = MAX_HEIGHT_VH / rows;
	return Math.max(0.85, Math.min(CELL_VH, byWidth, byHeight));
}

function childStyle(child: any, size: number, info: any) {
	const url = urlItemImg(child.itemId);
	const width = info ? info.width : 1;
	const height = info ? info.height : 1;
	const style: any = {
		backgroundImage: 'url(' + url + ')',
		width: 'calc(' + width * size + 'vh + ' + (width - 1) + 'px)',
		height: 'calc(' + height * size + 'vh + ' + (height - 1) + 'px)',
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
	};
	if (child.params && child.params.health && !child.found) {
		style.backgroundImage = 'url(' + url + '), ' + itemGradient(child);
		style.backgroundColor = '#fff0';
	}
	return style;
}

function ContentsPreview(props: ContentsPreviewProps) {
	const itemsInfo = useInventoryStore(function (store) {
		return store.itemsInfo;
	});
	void props.equipment;
	void props.environment;

	const pockets = visiblePockets(props.item);
	if (!hasVisibleItems(pockets)) return null;
	const size = cellSize(pockets);

	return (
		<div className={styles.root} data-contents="1">
			<div className={props.open ? styles.hintOn : styles.hint}>
				<span>Зажмите</span>
				<span className={styles.key}>Shift</span>
				<span>чтобы посмотреть содержимое</span>
			</div>
			{props.open ? (
				<div className={styles.pockets}>
					{pockets.map(function (pocket: any, pocketIndex: number) {
						const cells = [];
						const count = pocket.cols * pocket.rows;
						for (let index = 0; index < count; index++) {
							cells.push(
								<div
									key={'c' + index}
									className={styles.cell}
								/>
							);
						}
						const placed = [];
						const items = pocket.items || {};
						for (const key in items) {
							const child = items[key];
							if (!child || child.search) continue;
							const coord = indexToXY(pocket.rows, pocket.cols, key);
							if (!coord) continue;
							const look = childStyle(child, size, itemsInfo[child.itemId]);
							look.left = 'calc(' + coord.x + ' * (' + size + 'vh + 1px))';
							look.top = 'calc(' + coord.y + ' * (' + size + 'vh + 1px))';
							placed.push(
								<div key={'i' + key} className={styles.child} style={look} title={getItemName(child) || ''}>
									{child.params && child.params.count ? <div className={styles.count}>{child.params.count}</div> : null}
								</div>
							);
						}
						return (
							<div
								key={pocketIndex}
								className={styles.grid}
								style={{
									gridTemplateColumns: 'repeat(' + pocket.cols + ', ' + size + 'vh)',
									gridTemplateRows: 'repeat(' + pocket.rows + ', ' + size + 'vh)',
								}}
							>
								{cells}
								{placed}
							</div>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

export default memo(ContentsPreview);
