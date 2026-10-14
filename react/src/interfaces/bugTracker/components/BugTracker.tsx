import React, { memo } from 'react';
import styles from './BugTracker.module.css';
import { useBugTrackerStore } from '../store';
import BugList from './BugList';
import BugView from './BugView';
import CreateForm from './CreateForm';

function BugTracker() {
	const bugI = useBugTrackerStore(state => state.bugI);

	return (
		<div className={styles.root}>
			<BugList />
			<div className={styles.right}>{bugI == -1 ? <CreateForm /> : <BugView />}</div>
		</div>
	);
}

export default memo(BugTracker);
