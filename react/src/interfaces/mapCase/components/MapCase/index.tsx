import React, { memo } from 'react';
import Content from '../Content';
import Load from '../Load';
import Menu from '../Menu';
import PublicationForm from '../PublicationForm';
import OverFine from '../OverFine';
import OverWanted from '../OverWanted';
import Popup from '../Popup';
import Verification from '../Verification';
import { hidePopupMessage, useMapCaseStore } from '../../store';
import styles from './index.module.css';

function BlurShadow() {
	return <div className={styles.shadow} onClick={hidePopupMessage} />;
}

function MapCase() {
	const type = useMapCaseStore(state => state.type);
	const loadMod = useMapCaseStore(state => state.loadMod);
	const popupMessage = useMapCaseStore(state => state.popupMessage);
	const verification = useMapCaseStore(state => state.verification);
	const currentOverWindow = useMapCaseStore(state => state.currentOverWindow);
	const overKey = useMapCaseStore(state => state.overKey);
	const blur = !!(loadMod || popupMessage || verification || currentOverWindow);
	const fine =
		currentOverWindow === 'map-case-pd-over-fine' ||
		currentOverWindow === 'map-case-fib-over-fine';
	const wanted =
		currentOverWindow === 'map-case-pd-over-wanted' ||
		currentOverWindow === 'map-case-fib-over-wanted';
	const ads = currentOverWindow === 'map-case-wnews-over-ads';

	return (
		<div className={styles.root} data-faction={type}>
			<div className={styles.bg}>
				<div className={blur ? styles.screen + ' ' + styles.blur : styles.screen}>
					<Menu />
					<Content />
					{blur ? <BlurShadow /> : null}
				</div>
				<Load />
				<Popup />
				<Verification />
				{fine ? <OverFine key={overKey} /> : null}
				{wanted ? <OverWanted key={overKey} /> : null}
				{ads ? <PublicationForm key={overKey} /> : null}
			</div>
		</div>
	);
}

export default memo(MapCase);
