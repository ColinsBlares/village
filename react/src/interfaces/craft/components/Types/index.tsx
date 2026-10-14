import React, { memo } from 'react';
import styles from './index.module.css';
import { setCraftType, useCraftStore } from '../../store';

function Types() {
	const viewTick = useCraftStore(state => state.viewTick);
	const crafter = useCraftStore(state => state.crafter);
	if (!crafter) return null;

	return (
		<div className={styles.header} data-tick={viewTick}>
			{crafter.types.map(function (type, index) {
				const active = index == crafter.typeI;
				const className = active ? styles.tab + ' ' + styles.active : styles.tab;
				return (
					<div
						key={index}
						className={className}
						onClick={function () {
							setCraftType(index);
						}}
					>
						{type.name}
					</div>
				);
			})}
		</div>
	);
}

export default memo(Types);
