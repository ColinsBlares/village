import React, { memo } from 'react';
import styles from './KillList.module.css';
import { useKillListStore } from '../store';
import Log from './Log';

function KillList() {
	const list = useKillListStore(state => state.list);

	return (
		<div className={styles.root}>
			{list.map(function (kill, index) {
				return <Log key={index} kill={kill} />;
			})}
		</div>
	);
}

export default memo(KillList);
