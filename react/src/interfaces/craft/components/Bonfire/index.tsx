import React, { memo } from 'react';
import styles from './index.module.css';
import { formatCraftTime } from '../../logic';
import { acceptFirewood, changeFirewood, useCraftStore } from '../../store';

function Bonfire() {
	const helpShow = useCraftStore(state => state.helpShow);
	const destroyTick = useCraftStore(state => state.destroyTick);
	const firewoodCount = useCraftStore(state => state.firewoodCount);
	const crafter = useCraftStore(state => state.crafter);

	if (helpShow || !crafter || !crafter.destroyTime) return null;

	const deficit = crafter.destroyTime < 60;

	return (
		<div className={styles.bonfire} data-tick={destroyTick}>
			<div className={deficit ? styles.title + ' ' + styles.deficit : styles.title}>
				Горит {formatCraftTime(crafter.destroyTime)}
				{firewoodCount ? <span>+{formatCraftTime(firewoodCount * 60)}</span> : null}
			</div>
			<div className={styles.selector}>
				<div className={styles.button} onClick={function () { changeFirewood(-1); }}>
					-
				</div>
				<div className={styles.count}>{firewoodCount} ед.</div>
				<div className={styles.button} onClick={function () { changeFirewood(1); }}>
					+
				</div>
			</div>
			<div className={styles.accept} onClick={acceptFirewood}>
				Подкинуть
			</div>
		</div>
	);
}

export default memo(Bonfire);
