import React, { memo } from 'react';
import styles from './index.module.css';
import { addCoins, pretty, useCharacterInfoStore } from '../../store';
import coinsImg from '@imgs/characterInfo/coins.svg';

function Coins() {
	const coins = useCharacterInfoStore(state => state.coins);
	const showAddCoins = useCharacterInfoStore(state => state.showAddCoins);

	return (
		<div className={styles.coins}>
			{showAddCoins ? (
				<div className={styles.addCoins} onClick={addCoins}>
					Пополнить счёт
				</div>
			) : null}
			<div className={styles.panel}>
				Ваш счёт: <span>{pretty(coins)}</span>
				<img src={coinsImg} alt="" />
			</div>
		</div>
	);
}

export default memo(Coins);
