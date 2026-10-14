import React from 'react';
import styles from './index.module.css';
import { acceptOffer, useOfferDialogStore } from '../../store';

function Agree() {
	const green = useOfferDialogStore(state => state.green);
	const svgClass = green ? styles.green : undefined;

	return (
		<div className={styles.agree} onClick={acceptOffer}>
			<svg className={svgClass} width="37" height="37" viewBox="0 0 37 37">
				<circle cx="18.5" cy="18.5" r="17.5" strokeWidth="2" />
				<circle className={styles.fill} cx="18.5" cy="18.5" r="10.5" />
				<path
					d="M17.7816 25V20.014L12.5436 12.4H14.2716L18.5196 18.7L22.8036 12.4H24.4596L19.2216 19.996V25H17.7816Z"
					fill="white"
				/>
			</svg>
		</div>
	);
}

export default React.memo(Agree);
