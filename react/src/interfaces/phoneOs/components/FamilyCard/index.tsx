import React, { memo } from 'react';
import { family } from '../../apps';
import { openApp, removeItem } from '../../store';
import { useHoldDrag } from '../../useHoldDrag';
import RemoveButton from '../RemoveButton';
import edit from '../RemoveButton/index.module.css';
import styles from './index.module.css';

function FamilyCard() {
	const hold = useHoldDrag('family-card', function () {
		openApp('family');
	});
	if (!hold.slot) {
		return null;
	}
	const shake = hold.editing && !hold.dragging;

	return (
		<div
			data-tile="true"
			className={styles.card + (hold.dragging ? ' ' + styles.dragging : '')}
			style={{ left: hold.slot.x, top: hold.slot.y, width: hold.slot.w, height: hold.slot.h }}
			{...hold.bind}
		>
			<div className={shake ? edit.shake : styles.plain} style={shake ? { animationDelay: hold.shakeDelay } : undefined}>
				{shake ? (
					<RemoveButton
						inset={false}
						onRemove={function () {
							removeItem('family-card');
						}}
					/>
				) : null}
				<img className={styles.photo} src={family} alt="" draggable={false} />
				<span className={styles.name}>Семья</span>
			</div>
		</div>
	);
}

export default memo(FamilyCard);
