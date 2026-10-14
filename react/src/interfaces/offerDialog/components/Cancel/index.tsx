import React from 'react';
import styles from './index.module.css';
import { declineOffer, useOfferDialogStore } from '../../store';

function Cancel() {
	const red = useOfferDialogStore(state => state.red);
	const svgClass = red ? styles.red : undefined;

	return (
		<div className={styles.cancel} onClick={declineOffer}>
			<svg className={svgClass} width="37" height="37" viewBox="0 0 37 37">
				<circle cx="18.5" cy="18.5" r="17.5" strokeWidth="2" />
				<circle className={styles.fill} cx="18.5" cy="18.5" r="10.5" />
				<path
					d="M13.1716 25V12.4H14.5036L22.4416 22.498V12.4H23.8276V25H22.6936L14.5576 14.668V25H13.1716Z"
					fill="white"
				/>
			</svg>
		</div>
	);
}

export default React.memo(Cancel);
