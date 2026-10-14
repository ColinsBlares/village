import React, { memo } from 'react';
import styles from './index.module.css';
import { pretty, useCharacterInfoStore } from '../../store';
import cashImg from '@imgs/hud/cash.svg';
import cardImg from '@imgs/hud/credit-card.svg';
import warnImg from '@imgs/characterInfo/warn.svg';

function Stats() {
	const character = useCharacterInfoStore(state => {
		if (state.i >= state.characters.length) {
			return null;
		}
		return state.characters[state.i];
	});

	if (!character) {
		return null;
	}

	const parts = (character.name || '').split(' ');

	return (
		<div className={styles.infoBox}>
			<div className={styles.header}>Статистика персонажа</div>
			<div className={styles.content}>
				<div className={styles.name}>
					{parts[0]}
					<br />
					{parts[1]}
				</div>
				<div className={styles.money}>
					<div className={styles.cash}>
						<img src={cashImg} alt="" />$ {pretty(character.cash)}
					</div>
					<div className={styles.bank}>
						<img src={cardImg} alt="" />$ {pretty(character.bank)}
					</div>
				</div>
				<table className={styles.table}>
					<tbody>
						<tr>
							<td>
								Игровой статус:
								<div>{character.status}</div>
							</td>
							<td>
								Отыграно:
								<div>{character.hours} часов</div>
							</td>
						</tr>
						<tr>
							<td>
								Организация:
								<div>{character.faction}</div>
							</td>
							<td>
								Профессия:
								<div>{character.job}</div>
							</td>
						</tr>
						<tr>
							<td>
								Проживание:
								<div>{character.house}</div>
							</td>
							<td>
								Бизнес:
								<div>{character.biz}</div>
							</td>
						</tr>
					</tbody>
				</table>
				{character.warns ? (
					<div className={styles.warns}>
						<img src={warnImg} alt="" />
						Предупреждений: {character.warns}
					</div>
				) : null}
			</div>
		</div>
	);
}

export default memo(Stats);
