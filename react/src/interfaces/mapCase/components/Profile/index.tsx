import React, { memo } from 'react';
import handcuffs from '@imgs/mapCase/handcuffs.svg';
import radar from '@imgs/mapCase/radar.svg';
import receipt from '@imgs/mapCase/receipt.svg';
import { getFactionData } from '../../data';
import { mapCaseSvgPaths } from '../../svgPaths';
import { setCurrentOverWindow, useMapCaseStore } from '../../store';
import styles from './index.module.css';

const STARS = [1, 2, 3, 4, 5];

function Profile() {
	const type = useMapCaseStore(state => state.type);
	const menuFocus = useMapCaseStore(state => state.menuFocus);
	const tick = useMapCaseStore(state => state.tick);
	void tick;
	const data = getFactionData(type);
	const profileRoot = data ? data.windowsData.profile : null;
	if (!profileRoot) return null;
	const profile = profileRoot.profileData[menuFocus] || {};

	function showOnMap() {
		mp.trigger('callRemote', 'mapCase.pd.wanted.search', profile.id);
	}

	return (
		<div>
			<div className={styles.title}>Профиль</div>
			<div className={styles.body}>
				<div className={styles.name}>
					{profile.name} <span>ID: {profile.id}</span>
				</div>
				{profile.danger ? (
					<div className={styles.danger}>
						<div className={styles.stars}>
							{STARS.map(function (n) {
								return (
									<svg key={n} className={profile.danger >= n ? styles.on : undefined} viewBox="0 0 14 14">
										<path d={mapCaseSvgPaths.dangerStar[0]} />
									</svg>
								);
							})}
						</div>
						<div className={styles.cause}>{profile.cause}</div>
					</div>
				) : null}
				<div className={styles.dataHead}>Информация о гражданине</div>
				<div className={styles.data}>
					<div className={styles.wrap}>
						{profileRoot.infoList.map(function (record: { title: string; key: string }) {
							return (
								<div key={record.key} className={styles.record}>
									{record.title}
									<span>{profile[record.key]}</span>
								</div>
							);
						})}
					</div>
				</div>
				<div className={styles.footer}>
					{profile.danger ? (
						<div className={styles.footerBtn} onClick={showOnMap}>
							<img src={radar} alt="" />
						</div>
					) : null}
					<div className={styles.footerBtn} onClick={function () { setCurrentOverWindow('map-case-' + type + '-over-fine'); }}>
						<img src={receipt} alt="" />
					</div>
					<div className={styles.footerBtn} onClick={function () { setCurrentOverWindow('map-case-' + type + '-over-wanted'); }}>
						<img src={handcuffs} alt="" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default memo(Profile);
