import React, { memo } from 'react';
import styles from './PlayerMenu.module.css';
import logoImg from '@imgs/playerMenu/logo.png';
import Content from './Content';
import Confirm from './Confirm';

function PlayerMenu() {
	return (
		<div className={styles.root}>
			<img className={styles.logo} src={logoImg} alt="" />
			<Content />
			<Confirm />
		</div>
	);
}

export default memo(PlayerMenu);
