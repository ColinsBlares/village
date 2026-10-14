import React, { memo } from 'react';
import styles from './GovernmentBadge.module.css';
import Emblem from './Emblem';
import Cancel from './Cancel';
import Name from './Name';
import Rank from './Rank';
import Identifier from './Identifier';
import Sign from './Sign';
import DirectorSign from './DirectorSign';
import Info from './Info';

function GovernmentBadge() {
	return (
		<div className={styles.root}>
			<Emblem />
			<Cancel />
			<Name />
			<Rank />
			<Identifier />
			<Sign />
			<DirectorSign />
			<Info />
		</div>
	);
}

export default memo(GovernmentBadge);
