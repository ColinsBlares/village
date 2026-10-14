import React, { memo } from 'react';
import wifi from '@imgs/mapCase/wifi.svg';
import { useMapCaseStore } from '../../store';
import styles from './index.module.css';

function TopBar() {
	const time = useMapCaseStore(state => state.time);

	return (
		<div className={styles.bar}>
			<div>{time}</div>
			<div>
				<img src={wifi} alt="" />
			</div>
		</div>
	);
}

export default memo(TopBar);
