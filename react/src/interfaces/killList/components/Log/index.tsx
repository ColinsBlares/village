import React, { memo } from 'react';
import styles from './index.module.css';
import carIcon from '@imgs/killList/car.svg';
import handIcon from '@imgs/killList/hand.svg';
import killIcon from '@imgs/killList/kill.svg';
import { KillEntry, isWeaponReason, playerColor } from '../../store';

const ICONS: Record<string, string> = {
	car: carIcon,
	hand: handIcon,
	kill: killIcon,
};

function killIconSrc(reason?: string) {
	if (reason && ICONS[reason]) return ICONS[reason];
	return killIcon;
}

function Log({ kill }: { kill: KillEntry }) {
	const reason = kill.reason;
	const showWeapon = !!(reason && isWeaponReason(reason));

	return (
		<div className={styles.log}>
			{kill.killer ? (
				<div style={{ color: playerColor(kill.killer) }}>{kill.killer.name}</div>
			) : null}
			<img className={styles.icon} src={killIconSrc(reason)} alt="" />
			<div style={{ color: playerColor(kill.target) }}>
				{kill.target.name}
				{showWeapon ? <span> из {reason}</span> : null}
			</div>
		</div>
	);
}

export default memo(Log);
