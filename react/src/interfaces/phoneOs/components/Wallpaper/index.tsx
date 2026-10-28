import React, { memo } from 'react';
import { wallpaper } from '../../apps';
import { usePhoneOsStore } from '../../store';
import styles from './index.module.css';

function Wallpaper() {
	const phase = usePhoneOsStore(state => state.phase);
	const flashlight = usePhoneOsStore(state => state.flashlight);
	const zoom = phase === 'unlocking' || phase === 'home';
	const tone = zoom ? styles.zoom : styles.drift;

	return (
		<div className={styles.wallpaper + ' ' + tone}>
			<img src={wallpaper} alt="" draggable={false} />
			{flashlight && phase === 'lock' ? <div className={styles.flash} /> : null}
		</div>
	);
}

export default memo(Wallpaper);
