import React, { memo } from 'react';
import styles from './index.module.css';
import { useCraftStore } from '../../store';

function HelpInfo() {
	const helpShow = useCraftStore(state => state.helpShow);
	const crafter = useCraftStore(state => state.crafter);
	if (!helpShow || !crafter) return null;
	return <div className={styles.info}>{crafter.description}</div>;
}

export default memo(HelpInfo);
