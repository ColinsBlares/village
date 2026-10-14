import React, { memo } from 'react';
import styles from './index.module.css';
import PlayerInfo from '../PlayerInfo';
import Clock from '../Clock';
import PromoButton from '../PromoButton';
import MenuBar from '../MenuBar';

function Header() {
	return (
		<div>
			<div className={styles.topBar}>
				<PlayerInfo />
				<Clock />
				<PromoButton />
			</div>
			<div className={styles.line} />
			<MenuBar />
		</div>
	);
}

export default memo(Header);
