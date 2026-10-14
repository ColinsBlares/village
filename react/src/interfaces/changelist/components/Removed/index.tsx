import React, { memo } from 'react';
import styles from './index.module.css';
import {
	ChangelistState,
	EMPTY_LINES,
	prettyText,
	useChangelistStore,
} from '../../store';

function selectRemoved(state: ChangelistState) {
	const entry = state.list[state.i];
	return entry ? entry.removed : EMPTY_LINES;
}

function Removed() {
	const items = useChangelistStore(selectRemoved);
	const maxLength = useChangelistStore(state => state.maxLength);

	if (!items.length) {
		return null;
	}

	return (
		<React.Fragment>
			<br />
			{items.map(function (text, index) {
				return (
					<div className={styles.row} title={text} key={index}>
						<span className={styles.mark}>
							<i className="fas fa-trash" />
						</span>
						{prettyText(text, maxLength)}
					</div>
				);
			})}
		</React.Fragment>
	);
}

export default memo(Removed);
