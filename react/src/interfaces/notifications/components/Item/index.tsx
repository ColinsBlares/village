import React from 'react';
import styles from './index.module.css';
import { useNotificationsStore } from '../../store';
import errorImg from '@imgs/notifications/error.svg';
import infoImg from '@imgs/notifications/info.svg';
import successImg from '@imgs/notifications/success.svg';
import warningImg from '@imgs/notifications/warning.svg';
import cashImg from '@imgs/notifications/cash.svg';
import moneyImg from '@imgs/notifications/money.svg';

const IMAGES: Record<string, string> = {
	error: errorImg,
	info: infoImg,
	success: successImg,
	warning: warningImg,
	cash: cashImg,
	money: moneyImg,
};

function Item({ hash }: { hash: number }) {
	const message = useNotificationsStore(function (state) {
		const messages = state.messages;
		for (let i = 0; i < messages.length; i++) {
			if (messages[i].hash === hash) {
				return messages[i];
			}
		}
		return null;
	});

	if (!message) {
		return null;
	}

	const parts = message.type.split(' ');
	let typeClass = styles.box;
	for (let i = 0; i < parts.length; i++) {
		const partClass = (styles as any)[parts[i]];
		if (partClass) {
			typeClass += ' ' + partClass;
		}
	}

	const src = IMAGES[message.img] || '';

	return (
		<div className={typeClass}>
			<img src={src} alt="" />
			<div className={styles.message}>
				{message.header ? (
					<div className={styles.header}>{message.header}</div>
				) : null}
				{message.text}
			</div>
		</div>
	);
}

export default React.memo(Item);
