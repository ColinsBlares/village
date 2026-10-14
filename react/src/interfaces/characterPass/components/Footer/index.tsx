import React, { memo } from 'react';
import styles from './index.module.css';
import { getPaddingNumber } from '@utils/cefBridge';
import { useCharacterPassStore } from '../../store';

function Footer() {
	const fName = useCharacterPassStore(state => state.fName);
	const sName = useCharacterPassStore(state => state.sName);
	const number = useCharacterPassStore(state => state.number);
	const prettyNumber = getPaddingNumber(number, 10);

	return (
		<div className={styles.footer}>
			P&lt;USA{fName}&lt;&lt;{sName}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
			<br />
			Numpass&lt;&lt;{prettyNumber}
		</div>
	);
}

export default memo(Footer);
