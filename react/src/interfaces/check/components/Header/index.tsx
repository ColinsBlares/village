import React, { memo } from 'react';
import styles from './index.module.css';
import { useCheckStore } from '../../store';
import repairLogo from '@imgs/check/repairLogo.svg';

const LOGOS: { [name: string]: string } = {
	'repairLogo.svg': repairLogo,
};

function Header() {
	const checkName = useCheckStore(state => state.checkName);
	const logo = useCheckStore(state => state.logo);
	const src = LOGOS[logo] || '';

	return (
		<div className={styles.header}>
			<div className={styles.name}>{checkName}</div>
			<div className={styles.logo}>{src ? <img src={src} alt="" /> : null}</div>
			<svg className={styles.headLine}>
				<line x1="0" y1="0" x2="100%" y2="0" />
			</svg>
		</div>
	);
}

export default memo(Header);
