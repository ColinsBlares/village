import React, { memo } from 'react';
import styles from './index.module.css';
import { usePlayerMenuStore } from '../../store';
import megafonImg from '@imgs/playerMenu/megafon.svg';
import fileImg from '@imgs/playerMenu/file.svg';
import clockImg from '@imgs/playerMenu/clock.svg';
import smileImg from '@imgs/playerMenu/smile.svg';

function Reference() {
	const code = usePlayerMenuStore(state => state.promocode);
	const amountInvitees = usePlayerMenuStore(state => state.amountInvitees);
	const amountCompleted = usePlayerMenuStore(state => state.amountCompleted);

	return (
		<div className={styles.reference}>
			<div className={styles.left}>
				<div className={styles.line} />
				<div className={styles.record}>
					<div className={styles.circle}>
						<img src={megafonImg} alt="" />
					</div>
					<div>
						Расскажите друзьям о вашем
						<br />
						реферальном промокоде
					</div>
				</div>
				<div className={styles.record}>
					<div className={styles.circle}>
						<img src={fileImg} alt="" />
					</div>
					<div>
						Ваш реферальный промокод должны ввести
						<br />в специальное окно для ввода промокодов
					</div>
				</div>
				<div className={styles.record}>
					<div className={styles.circle}>
						<img src={clockImg} alt="" />
					</div>
					<div className={styles.text}>А также отыграть на нашем сервере 24 часа</div>
				</div>
				<div className={styles.record}>
					<div className={styles.circle}>
						<img src={smileImg} alt="" />
					</div>
					<div>
						По достижении онлайна 24 часов вам и вашему другу
						<br />
						будет начислено по $10 000
					</div>
				</div>
			</div>
			<div className={styles.right}>
				<div className={styles.head}>Ваш реферальный промокод:</div>
				<div className={styles.num + ' ' + styles.cp}>{code}</div>
				<div className={styles.head}>Количество приглашённых:</div>
				<div className={styles.num}>{amountInvitees}</div>
				<div className={styles.head}>Количество выполнивших условие:</div>
				<div className={styles.num + ' ' + styles.gr}>{amountCompleted}</div>
			</div>
		</div>
	);
}

export default memo(Reference);
