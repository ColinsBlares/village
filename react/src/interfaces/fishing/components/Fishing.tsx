import React, { memo } from 'react';
import styles from './Fishing.module.css';
import Line from './Line';
import Wait from './Wait';
import Help from './Help';
import { useFishingStore } from '../store';

function Fishing() {
	const isStarted = useFishingStore(state => state.isStarted);
	const isFetch = useFishingStore(state => state.isFetch);
	const position = useFishingStore(state => state.position);
	const zone = useFishingStore(state => state.zone);
	const weight = useFishingStore(state => state.weight);
	const isInZone = isFetch && zone != null
		&& Math.abs(position + 3 - 50) < parseInt(String(zone / 2), 10);

	const title = !isStarted
		? 'Готовы к рыбалке?'
		: isFetch ? 'Подсеките в нужный момент' : 'Ждём поклёвку';
	const stateLabel = !isStarted
		? 'У воды'
		: isFetch ? isInZone ? 'В зоне!' : 'Поклёвка' : 'Ожидание';

	return (
		<div className={styles.root}>
			<div className={styles.panel}>
				<header className={styles.header}>
					<div className={styles.titleGroup}>
						<div className={styles.icon} aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M4 5.5c4.2 0 7 2.8 7 7v6M11 12.5c0 3.4-1.9 5.5-4.5 5.5A2.5 2.5 0 0 1 4 15.5c0-1.1.9-2 2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
								<path d="M4 5.5 2.5 4M4 5.5 5.5 4M11 12.5c3.8 0 6.5-2.2 8-6M19 6.5l.5-2M19 6.5l2 .2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</div>
						<div>
							<p className={styles.eyebrow}>Тихая вода · хороший клёв</p>
							<h1 className={styles.title}>{title}</h1>
						</div>
					</div>
					<div className={[
						styles.state,
						isFetch ? isInZone ? styles.stateBite : styles.stateActive : '',
					].join(' ')}>
						<span className={styles.stateDot} />
						{stateLabel}
					</div>
				</header>

				<div className={[styles.scene, isFetch ? styles.sceneActive : ''].join(' ')}>
					<div className={styles.sceneGlow} />
					<div className={styles.sceneLabel}>
						{isFetch ? 'Рыба клюнула — следите за индикатором' : 'Поплавок на воде'}
					</div>
					{weight != null ? (
						<div className={styles.weight}>
							<span className={styles.weightValue}>{weight}</span>
							<span className={styles.weightUnit}>кг · улов</span>
						</div>
					) : null}
					<div className={[styles.ripple, styles.rippleSecond].join(' ')} />
					<div className={styles.ripple} />
					<div className={[styles.water, styles.waterBack].join(' ')} />
					<div className={styles.water} />
					<div className={styles.float} />
				</div>

				<Line />

				<footer className={styles.footer}>
					<Wait isInZone={isInZone} />
					<Help />
				</footer>
			</div>
		</div>
	);
}

export default memo(Fishing);
