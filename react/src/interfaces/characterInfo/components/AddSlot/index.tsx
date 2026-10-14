import React, { memo } from 'react';
import styles from './index.module.css';
import { addSlot, isAddSlotVisible, useCharacterInfoStore } from '../../store';
import coinsImg from '@imgs/characterInfo/coins.svg';

function AddSlot() {
	const visible = useCharacterInfoStore(isAddSlotVisible);
	const price = useCharacterInfoStore(state => state.slotPrice);
	const hours = useCharacterInfoStore(state => state.slotHours);
	const oneSlot = useCharacterInfoStore(state => state.slots == 1);

	if (!visible) {
		return null;
	}

	const slotClass = oneSlot ? styles.addSlot + ' ' + styles.step : styles.addSlot;

	return (
		<div className={styles.root}>
			<div className={slotClass}>
				<div>
					Стоимоcть услуги: <span>{price}</span>
					<img src={coinsImg} alt="" />
				</div>
				<div className={styles.btn} onClick={addSlot}>
					Добавить слот
				</div>
			</div>
			{oneSlot ? (
				<div className={styles.other}>
					<div className={styles.or}>
						<div>ИЛИ</div>
					</div>
					<div className={styles.info}>
						<div>
							Отыграйте <span>{hours}</span> часов
							<br />
							на вашем первом персонаже
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export default memo(AddSlot);
