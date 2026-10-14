import React, { memo, useState } from 'react';
import { getFactionData } from '../../data';
import { mapCaseSvgPaths } from '../../svgPaths';
import { setCurrentOverWindow, setInputFocus, showLoad, useMapCaseStore } from '../../store';
import fineStyles from '../OverFine/index.module.css';
import styles from './index.module.css';

const STARS = [1, 2, 3, 4, 5];

function OverWanted() {
	const type = useMapCaseStore(state => state.type);
	const menuFocus = useMapCaseStore(state => state.menuFocus);
	const [cause, setCause] = useState('');
	const [danger, setDanger] = useState(0);
	const [overDanger, setOverDanger] = useState(0);
	const data = getFactionData(type);
	const profileRoot = data ? data.windowsData.profile : null;
	const profile = profileRoot ? profileRoot.profileData[menuFocus] || {} : {};

	function give() {
		if (!cause && danger) return;
		if (!profileRoot) return;
		showLoad();
		setCurrentOverWindow(null);
		profileRoot.giveWanted(cause, danger, profile);
		setCause('');
		setDanger(1);
	}

	function over(n: number) {
		if (n < 0) setOverDanger(danger);
		else setOverDanger(n);
	}

	return (
		<div
			className={fineStyles.box}
			onKeyPress={function (event) {
				if (event.keyCode == 13 && !useMapCaseStore.getState().loadMod) give();
			}}
		>
			<div className={fineStyles.header}> Выдача розыска {profile.name}</div>
			<div className={fineStyles.title}>Введите причину</div>
			<div className={fineStyles.input}>
				<input
					maxLength={30}
					placeholder="Введите причину выдачи розыска..."
					value={cause}
					onChange={function (event) { setCause(event.target.value); }}
					onFocus={function () { setInputFocus(true); }}
					onBlur={function () { setInputFocus(false); }}
				/>
			</div>
			<div className={fineStyles.title}>Выберите степень опасности</div>
			<div
				className={styles.stars}
				onClick={function (event) {
					if (event.target !== event.currentTarget) return;
					setOverDanger(0);
					setDanger(0);
				}}
			>
				{STARS.map(function (n) {
					return (
						<svg
							key={n}
							className={overDanger >= n ? styles.on : undefined}
							viewBox="0 0 14 14"
							onClick={function () { setDanger(overDanger); }}
							onMouseOver={function () { over(n); }}
							onMouseOut={function () { over(-1); }}
						>
							<path d={mapCaseSvgPaths.dangerStar[0]} />
						</svg>
					);
				})}
			</div>
			<div className={fineStyles.btns}>
				<div className={fineStyles.btn} onClick={give}>Выдать</div>
				<div className={fineStyles.btn} onClick={function () { setCurrentOverWindow(null); }}>Отмена</div>
			</div>
		</div>
	);
}

export default memo(OverWanted);
