import React, { memo } from 'react';
import styles from './index.module.css';
import { splitIdentifier, useMedicalCardStore } from '../../store';

function Identifier() {
	const identifier = useMedicalCardStore(state => state.identifier);

	return <div className={styles.identifier}>{splitIdentifier(identifier)}</div>;
}

export default memo(Identifier);
