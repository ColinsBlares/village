import React, { memo } from 'react';
import styles from './index.module.css';
import {
	ChangelistState,
	EMPTY_LINES,
	prettyText,
	useChangelistStore,
} from '../../store';

function selectFeatures(state: ChangelistState) {
	const entry = state.list[state.i];
	return entry ? entry.features : EMPTY_LINES;
}

function Features() {
	const items = useChangelistStore(selectFeatures);
	const maxLength = useChangelistStore(state => state.maxLength);

	if (!items.length) {
		return null;
	}

	return (
		<React.Fragment>
			{items.map(function (text, index) {
				return (
					<div className={styles.row} title={text} key={index}>
						<span className={styles.mark}>
							<i className="fas fa-star" />
						</span>
						<div>{prettyText(text, maxLength)}</div>
					</div>
				);
			})}
		</React.Fragment>
	);
}

export default memo(Features);
