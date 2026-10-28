import React from 'react';
import styles from './index.module.css';
import { useOfferDialogStore } from '../../store';

function Title() {
	const title = useOfferDialogStore(state => state.title);

	return <div className={styles.title}>{title}</div>;
}

export default React.memo(Title);
