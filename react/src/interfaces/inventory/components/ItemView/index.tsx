import React, { memo } from 'react';
import eyeImg from '@imgs/inventory/eye.svg';
import { cx } from '../../cx';
import { itemStyle, urlItemImg } from '../../model';
import styles from './index.module.css';

type ItemViewProps = {
	item: any;
	mode: 'pocket' | 'body' | 'hands' | 'hotkey' | 'desc' | 'drag';
	debug: boolean;
	dragging: boolean;
	onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
	onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
	onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
	onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
	onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

function ItemView(props: ItemViewProps) {
	const item = props.item;
	const params = item.params || {};
	const sized = props.mode === 'pocket' || props.mode === 'desc' || props.mode === 'drag';
	const style = sized ? itemStyle(item) : { backgroundImage: 'url(' + urlItemImg(item.itemId) + ')' };
	const showCount = props.mode === 'drag' ? false : props.mode === 'pocket' ? params.count && !item.found : !!params.count;
	const showEye = props.mode === 'pocket' && item.found;
	const showSql = props.debug && props.mode !== 'drag';
	const showLoader = item.wait && props.mode !== 'drag' && props.mode !== 'desc';

	return (
		<div
			className={cx(styles.item, 'inv-item', props.dragging && styles.dragging, showEye && styles.found)}
			style={style}
			onMouseEnter={props.onMouseEnter}
			onMouseLeave={props.onMouseLeave}
			onMouseMove={props.onMouseMove}
			onMouseDown={props.onMouseDown}
			onContextMenu={props.onContextMenu}
		>
			{showCount ? <div className={props.mode === 'hotkey' ? styles.hotkeyCount : styles.count}>{params.count}</div> : null}
			{showEye ? (
				<div className={styles.eye}>
					<img src={eyeImg} alt="" />
				</div>
			) : null}
			{showSql ? <div className={styles.sqlid}>#{item.sqlId}</div> : null}
			{showLoader ? (
				<div className={styles.loader}>
					<div className={styles.rolling}>
						<div />
					</div>
				</div>
			) : null}
		</div>
	);
}

export default memo(ItemView);
