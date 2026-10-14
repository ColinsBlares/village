import React, { memo } from 'react';
import burgerImg from '@imgs/hud/burger.svg';
import glassImg from '@imgs/hud/glass.svg';
import { cx } from '../../cx';
import { useInventoryStore } from '../../store';
import styles from './index.module.css';

function Starvation() {
	const satiety = useInventoryStore(function (store) {
		return store.satiety;
	});
	const thirst = useInventoryStore(function (store) {
		return store.thirst;
	});
	const searchMode = useInventoryStore(function (store) {
		return store.searchMode;
	});

	if (searchMode) return null;

	const satietyValue = Number(satiety);
	const thirstValue = Number(thirst);

	return (
		<div className={styles.starvation}>
			<div className={cx(styles.satiety, styles.record, satietyValue <= 10 && styles.red)}>
				<div className={styles.img}>
					<img src={burgerImg} alt="" />
				</div>
				<div className={styles.progress}>
					<div style={{ width: satietyValue + '%' }} />
				</div>
				<div className={styles.percent}>{+satietyValue.toFixed(1)}%</div>
			</div>
			<div className={cx(styles.thirst, styles.record, thirstValue <= 10 && styles.red)}>
				<div className={styles.img}>
					<img src={glassImg} alt="" />
				</div>
				<div className={styles.progress}>
					<div style={{ width: thirstValue + '%' }} />
				</div>
				<div className={styles.percent}>{+thirstValue.toFixed(1)}%</div>
			</div>
		</div>
	);
}

export default memo(Starvation);
