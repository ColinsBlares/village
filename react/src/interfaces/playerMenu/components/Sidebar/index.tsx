import React, { memo } from 'react';
import styles from './index.module.css';
import { DONATE_ITEMS, SETTINGS_ITEMS } from '../../data';
import { requestKick, setDonateWindow, setSettingsWindow, usePlayerMenuStore } from '../../store';
import { playerMenuSvgPaths } from '../../svgPaths';
import listImg from '@imgs/playerMenu/list.svg';
import settingsImg from '@imgs/playerMenu/settings.svg';
import SettingsMain from '../SettingsMain';
import SettingsProtection from '../SettingsProtection';
import DonateConvert from '../DonateConvert';
import DonateChangeName from '../DonateChangeName';
import DonateWarn from '../DonateWarn';
import DonateAddSlot from '../DonateAddSlot';

const PATHS = playerMenuSvgPaths as { [key: string]: string[] };

function Icon(props: { name: string; viewBox: string }) {
	const paths = PATHS[props.name] || [];
	return (
		<svg viewBox={props.viewBox}>
			{paths.map(function (d, index) {
				return <path key={index} d={d} />;
			})}
		</svg>
	);
}

function Sidebar(props: { kind: 'settings' | 'donate' }) {
	const focus = usePlayerMenuStore(function (state) {
		return props.kind === 'settings' ? state.settingsWindow : state.donateWindow;
	});
	const items = props.kind === 'settings' ? SETTINGS_ITEMS : DONATE_ITEMS;
	const title = props.kind === 'settings' ? 'Настройки' : 'Донат';
	const headImg = props.kind === 'settings' ? listImg : settingsImg;

	function onClick(windowId: string) {
		if (props.kind === 'settings') setSettingsWindow(windowId);
		else setDonateWindow(windowId);
	}

	return (
		<div className={styles.sidebar}>
			<div className={styles.left}>
				<div className={styles.head}>
					<img src={headImg} alt="" />
					<span>{title}</span>
				</div>
				<div className={styles.menu}>
					{items.map(function (item) {
						const className = item.window === focus ? styles.item + ' ' + styles.focus : styles.item;
						return (
							<div key={item.window} className={className} onClick={function () { onClick(item.window); }}>
								<div>{item.head}</div>
								<div>
									<Icon name={item.icon} viewBox="0 0 20 20" />
								</div>
							</div>
						);
					})}
					{props.kind === 'settings' ? (
						<div className={styles.item + ' ' + styles.bottom} onClick={requestKick}>
							<div>Выход</div>
							<div>
								<Icon name="exit" viewBox="0 0 36 36" />
							</div>
						</div>
					) : null}
				</div>
			</div>
			<div className={styles.line} />
			<div className={styles.main}>
				{props.kind === 'settings' ? <SettingsMain /> : <DonateConvert />}
				{props.kind === 'settings' ? <SettingsProtection /> : <DonateChangeName />}
				{props.kind === 'donate' ? <DonateWarn /> : null}
				{props.kind === 'donate' ? <DonateAddSlot /> : null}
			</div>
		</div>
	);
}

export default memo(Sidebar);
