import React, { memo } from 'react';
import styles from './index.module.css';
import { enterCode } from '../../store';
import boxImg from '@imgs/playerMenu/box.svg';

function PromoButton() {
	return (
		<div className={styles.btn} onClick={enterCode}>
			<div>Ввести промокод</div>
			<div>
				<img src={boxImg} alt="" />
			</div>
		</div>
	);
}

export default memo(PromoButton);
