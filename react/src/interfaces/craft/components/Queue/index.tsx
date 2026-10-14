import React, { memo } from 'react';
import styles from './index.module.css';
import { formatCraftTime, itemImage, playerName } from '../../logic';
import { onClickColumn, toggleHelp, useCraftStore } from '../../store';
import Bonfire from '../Bonfire';
import HelpInfo from '../HelpInfo';

function stateName(col: { state?: string; playerName?: string }) {
	const name = playerName();
	if (col.playerName != name) return col.playerName;
	if (col.state == 'process') return 'Изготовление';
	if (col.state == 'completed') return 'Завершено';
	if (col.state == 'unsuccessfully') return 'Неудачно';
	return '';
}

function Queue() {
	const queueTick = useCraftStore(state => state.queueTick);
	const helpShow = useCraftStore(state => state.helpShow);
	const crafter = useCraftStore(state => state.crafter);
	if (!crafter) return null;
	const name = playerName();

	return (
		<div className={styles.queue} data-tick={queueTick}>
			<div className={styles.header}>
				<div className={styles.title}>{crafter.name}</div>
				<div className={helpShow ? styles.help + ' ' + styles.helpActive : styles.help} onClick={toggleHelp}>
					<i className="fas fa-info" />
				</div>
			</div>
			{helpShow ? null : (
				<div className={styles.columns}>
					{crafter.queue.columns.map(function (col, index) {
						const classes = [styles.column];
						if (col.state && styles[col.state]) classes.push(styles[col.state]);
						if (col.itemId) classes.push(styles.filled);
						if (!col.itemId) classes.push(styles.empty);
						if (name != col.playerName) classes.push(styles.disabled);
						const width = col.maxTime ? 100 - ((col.time || 0) / col.maxTime) * 100 : 0;
						return (
							<div key={index} className={classes.join(' ')} onClick={function () { onClickColumn(index); }}>
								{col.itemId ? (
									<div className={styles.item}>
										<div className={styles.icon} style={{ backgroundImage: "url('" + itemImage(col.itemId) + "')" }} />
										<div className={styles.info}>
											{col.time ? <div className={styles.time}>{formatCraftTime(col.time)}</div> : null}
											<div className={styles.state}>{stateName(col)}</div>
										</div>
									</div>
								) : null}
								{col.state == 'process' ? <div className={styles.fill} style={{ width: width + '%' }} /> : null}
							</div>
						);
					})}
				</div>
			)}
			<Bonfire />
			<HelpInfo />
		</div>
	);
}

export default memo(Queue);
