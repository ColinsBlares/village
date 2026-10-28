import React, { memo } from 'react';
import type { Piece } from '../../grid';
import { openApp, removeItem } from '../../store';
import { useHoldDrag } from '../../useHoldDrag';
import RemoveButton from '../RemoveButton';
import edit from '../RemoveButton/index.module.css';
import styles from './index.module.css';

interface AppIconProps {
	piece: Piece;
	dock?: boolean;
}

function AppIcon({ piece, dock }: AppIconProps) {
	const hold = useHoldDrag(piece.key, function () {
		openApp(piece.id);
	});
	if (!hold.slot) {
		return null;
	}
	const shake = hold.editing && !hold.dragging;
	const inDock = !!dock && !hold.dragging;
	const className =
		styles.hit + (inDock ? ' ' + styles.dock : '') + (hold.dragging ? ' ' + styles.dragging : '');

	return (
		<div
			data-tile="true"
			className={className}
			style={{ left: hold.slot.x, top: hold.slot.y, width: hold.slot.w, height: hold.slot.h }}
			{...hold.bind}
		>
			<div className={shake ? edit.shake : undefined} style={shake ? { animationDelay: hold.shakeDelay } : undefined}>
				{shake && piece.key !== 'appstore' ? (
					<RemoveButton
						inset={!inDock}
						onRemove={function () {
							removeItem(piece.key);
						}}
					/>
				) : null}
				<img className={styles.glyph} src={piece.icon} alt="" draggable={false} />
				{inDock || hold.dragging ? null : <span className={styles.name}>{piece.name}</span>}
			</div>
		</div>
	);
}

export default memo(AppIcon);
