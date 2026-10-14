import React, { memo } from 'react';
import styles from './index.module.css';
import { getPaddingNumber, prettyMoney } from '@utils/cefBridge';
import { useCarPassStore } from '../../store';

function InfoA() {
	const id = useCarPassStore(state => state.id);
	const name = useCarPassStore(state => state.name);
	const vehType = useCarPassStore(state => state.vehType);
	const regDate = useCarPassStore(state => state.regDate);
	const price = useCarPassStore(state => state.price);

	return (
		<div className={styles.infoA}>
			<div className={styles.label}>Идентификатор</div>
			<div className={styles.value}>{getPaddingNumber(id, 10)}</div>
			<div className={styles.label}>Название</div>
			<div className={styles.value}>{name}</div>
			<div className={styles.label}>Тип Т/С</div>
			<div className={styles.value}>{vehType}</div>
			<div className={styles.label}>Дата регистрации</div>
			<div className={styles.value}>{regDate}</div>
			<div className={styles.label}>Гос. стоимость</div>
			<div className={styles.value}>${prettyMoney(price)}</div>
		</div>
	);
}

export default memo(InfoA);
