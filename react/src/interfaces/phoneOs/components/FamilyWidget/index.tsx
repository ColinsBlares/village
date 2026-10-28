import React, { memo } from 'react';
import { familyWidget } from '../../apps';
import { openApp, removeItem } from '../../store';
import { useHoldDrag } from '../../useHoldDrag';
import RemoveButton from '../RemoveButton';
import edit from '../RemoveButton/index.module.css';
import styles from './index.module.css';

function FamilyWidget() {
	const hold = useHoldDrag('family-widget', function () {
		openApp('family');
	});
	if (!hold.slot) {
		return null;
	}
	const shake = hold.editing && !hold.dragging;

	return (
		<div
			data-tile="true"
			className={styles.widget + (hold.dragging ? ' ' + styles.dragging : '')}
			style={{ left: hold.slot.x, top: hold.slot.y, width: hold.slot.w, height: hold.slot.h }}
			{...hold.bind}
		>
			<div className={shake ? edit.shake : styles.plain} style={shake ? { animationDelay: hold.shakeDelay } : undefined}>
				{shake ? (
					<RemoveButton
						inset={false}
						onRemove={function () {
							removeItem('family-widget');
						}}
					/>
				) : null}
				<img className={styles.photo} src={familyWidget} alt="" draggable={false} />
				<span className={styles.caption}>Семья - это Мы</span>
			</div>
		</div>
	);
}

export default memo(FamilyWidget);
