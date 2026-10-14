import React, { memo } from 'react';
import styles from './index.module.css';
import { ChangelistState, useChangelistStore } from '../../store';

function selectBuild(state: ChangelistState) {
	const entry = state.list[state.i];
	return entry ? entry.build : 0;
}

function Build() {
	const build = useChangelistStore(selectBuild);

	return (
		<div className={styles.build} title="Сборка">
			<i className="fas fa-code-branch" /> {build}
		</div>
	);
}

export default memo(Build);
