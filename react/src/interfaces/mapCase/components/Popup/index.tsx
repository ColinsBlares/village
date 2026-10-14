import React, { memo } from 'react';
import errorIcon from '@imgs/mapCase/error.svg';
import successIcon from '@imgs/mapCase/success.svg';
import tapIcon from '@imgs/mapCase/tap.svg';
import { useMapCaseStore } from '../../store';
import styles from './index.module.css';

function Popup() {
	const popupMessage = useMapCaseStore(state => state.popupMessage);
	if (!popupMessage) return null;

	const icon = popupMessage.img === 'success' ? successIcon : errorIcon;

	return (
		<div className={styles.popup}>
			<div className={styles.body}>
				<div>
					<img src={icon} alt="" />
				</div>
				<div dangerouslySetInnerHTML={{ __html: popupMessage.message }} />
			</div>
			<div className={styles.hint}>
				<div>
					<img src={tapIcon} alt="" />
				</div>
				<div>Кликните в любое место для закрытия окна</div>
			</div>
		</div>
	);
}

export default memo(Popup);
