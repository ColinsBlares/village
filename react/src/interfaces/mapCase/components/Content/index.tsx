import React, { memo } from 'react';
import returnIcon from '@imgs/mapCase/return.svg';
import { getMenuWindows, popWindow } from '../../data';
import { useMapCaseStore } from '../../store';
import Publications from '../Publications';
import Calls from '../Calls';
import DbResult from '../DbResult';
import DbSearch from '../DbSearch';
import Identification from '../Identification';
import Members from '../Members';
import Profile from '../Profile';
import TopBar from '../TopBar';
import Wanted from '../Wanted';
import styles from './index.module.css';

const ActiveWindow = memo(function ActiveWindow(props: { name: string }) {
	if (props.name === 'members') return <Members />;
	if (props.name === 'calls') return <Calls />;
	if (props.name === 'dbSearch') return <DbSearch />;
	if (props.name === 'dbResult') return <DbResult />;
	if (props.name === 'wanted') return <Wanted />;
	if (props.name === 'identification') return <Identification />;
	if (props.name === 'profile') return <Profile />;
	if (props.name === 'ads') return <Publications />;
	return null;
});

function Content() {
	const type = useMapCaseStore(state => state.type);
	const menuFocus = useMapCaseStore(state => state.menuFocus);
	const tick = useMapCaseStore(state => state.tick);
	const wins = getMenuWindows(type, menuFocus);
	const name = wins.length ? wins[wins.length - 1] : '';
	void tick;

	return (
		<div className={styles.body}>
			<TopBar />
			<div className={styles.window}>
				<ActiveWindow name={name} />
				{wins.length > 1 ? (
					<button className={styles.back} onClick={popWindow}>
						<img src={returnIcon} alt="" />
					</button>
				) : null}
			</div>
		</div>
	);
}

export default memo(Content);
