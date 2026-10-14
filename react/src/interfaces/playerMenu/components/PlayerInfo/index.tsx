import React, { memo, useEffect, useRef } from 'react';
import styles from './index.module.css';
import { getSocialStatus, usePlayerMenuStore } from '../../store';
import userImg from '@imgs/playerMenu/user.svg';
import adminImg from '@imgs/playerMenu/admin.svg';
import capitolImg from '@imgs/playerMenu/capitol.svg';
import hatImg from '@imgs/playerMenu/hat.svg';
import mediaImg from '@imgs/playerMenu/media.svg';
import Coins from '../Coins';

const SOCIAL = [
	{ head: 'Обычный житель', img: userImg },
	{ head: 'Администратор', img: adminImg },
	{ head: 'Госслужащий', img: capitolImg },
	{ head: 'Бандит', img: hatImg },
	{ head: 'Медиа', img: mediaImg },
];

function NameStatus() {
	const name = usePlayerMenuStore(state => state.name);
	const admin = usePlayerMenuStore(state => state.admin);
	const media = usePlayerMenuStore(state => state.media);
	const factionId = usePlayerMenuStore(state => state.factionId);
	const nameRef = useRef<HTMLDivElement>(null);
	const defRef = useRef<HTMLSpanElement>(null);
	const status = getSocialStatus(admin, media, factionId);
	const social = SOCIAL[status];

	useEffect(
		function () {
			const timer = window.setTimeout(function () {
				if (!nameRef.current || !defRef.current) return;
				const longName = nameRef.current.offsetHeight > defRef.current.offsetHeight * 2;
				if (usePlayerMenuStore.getState().longName !== longName) {
					usePlayerMenuStore.setState({ longName: longName });
				}
			}, 100);
			return function () {
				window.clearTimeout(timer);
			};
		},
		[name, admin, media, factionId],
	);

	return (
		<div className={styles.name} ref={nameRef}>
			{name} |{' '}
			<span ref={defRef} className={styles.status + ' ' + styles['status' + status]}>
				{social.head} <img src={social.img} alt="" />
			</span>
		</div>
	);
}

const NameStatusView = memo(NameStatus);

function PlayerInfo() {
	return (
		<div className={styles.info}>
			<NameStatusView />
			<Coins />
		</div>
	);
}

export default memo(PlayerInfo);
