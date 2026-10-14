import React, { memo } from 'react';
import paper from '@imgs/mapCase/news-paper.svg';
import { mapCaseWnewsAdsData, requestAd } from '../../data/wnews';
import { useMapCaseStore } from '../../store';
import styles from './index.module.css';

function Publications() {
	const tick = useMapCaseStore(state => state.tick);
	void tick;
	const amount = mapCaseWnewsAdsData.adsAmount;

	return (
		<div className={styles.root}>
			<div className={styles.logo}>
				<img src={paper} alt="" />
			</div>
			<div className={styles.title}>РЕДАКТИРОВАНИЕ ОБЪЯВЛЕНИЯ</div>
			<div className={styles.hint}>
				Объявлений для редактирования: <span>{amount}</span>
			</div>
			<div className={styles.btn} onClick={requestAd}>Получить</div>
		</div>
	);
}

export default memo(Publications);
