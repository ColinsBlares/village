import React, { useLayoutEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import { useNotificationsStore } from '../../store';

function toneOf(type: string) {
	const head = String(type).split(' ')[0];
	if (head === 'success' || head === 'add') {
		return 'success';
	}
	if (head === 'error' || head === 'remove') {
		return 'error';
	}
	if (head === 'warning') {
		return 'warning';
	}
	return 'info';
}

function defaultTitle(type: string) {
	const parts = String(type).split(' ');
	const head = parts[0];
	const img = parts.length > 1 ? parts[1] : head;
	if (img === 'cash') {
		return 'Наличные';
	}
	if (img === 'money') {
		return 'Банк';
	}
	if (head === 'success' || head === 'add') {
		return 'Успешно';
	}
	if (head === 'error' || head === 'remove') {
		return 'Ошибка';
	}
	if (head === 'warning') {
		return 'Внимание';
	}
	return 'Информация';
}

const Mark = React.memo(function Mark({ tone }: { tone: string }) {
	if (tone === 'error') {
		return (
			<svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M7 7L17 17" pathLength="1" strokeWidth="1.5" />
				<path d="M17 7L7 17" pathLength="1" strokeWidth="1.5" />
			</svg>
		);
	}

	if (tone === 'warning') {
		return (
			<svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M12 6.5V13" pathLength="1" strokeWidth="1.8" />
				<path d="M12 17.2H12.01" strokeWidth="2.4" />
			</svg>
		);
	}

	if (tone === 'info') {
		return (
			<svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M12 10.5V17.2" pathLength="1" strokeWidth="1.8" />
				<path d="M12 7H12.01" strokeWidth="2.4" />
			</svg>
		);
	}

	return (
		<svg className={styles.icon + ' ' + styles.check} viewBox="0 0 26 22" fill="none" aria-hidden="true">
			<path d="M2 11.2L9 18.4L24 3" pathLength="1" strokeWidth="2" />
		</svg>
	);
});

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
	const innerRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState(0);
	const [shown, setShown] = useState(false);

	useLayoutEffect(function () {
		const el = innerRef.current;
		if (!el) {
			return undefined;
		}
		const next = el.offsetHeight;
		let second = 0;
		const first = requestAnimationFrame(function () {
			second = requestAnimationFrame(function () {
				setHeight(next);
				setShown(true);
			});
		});
		return function () {
			cancelAnimationFrame(first);
			if (second) {
				cancelAnimationFrame(second);
			}
		};
	}, []);

	useLayoutEffect(
		function () {
			if (!message || !message.leaving) {
				return;
			}
			setHeight(0);
			setShown(false);
		},
		[message],
	);

	if (!message) {
		return null;
	}

	const tone = toneOf(message.type);
	let slotClass = styles.slot;
	if (message.leaving) {
		slotClass += ' ' + styles.slotLeave;
	} else if (shown) {
		slotClass += ' ' + styles.slotShown;
	}

	const title = message.header || defaultTitle(message.type);

	return (
		<div className={slotClass} style={{ maxHeight: height }}>
			<div ref={innerRef}>
				<div className={styles.card + ' ' + styles[tone]}>
					<div className={styles.track}>
						<div
							className={styles.fill}
							style={{ animationDuration: message.duration + 'ms' }}
						/>
					</div>
					<Mark tone={tone} />
					<div className={styles.copy}>
						<div className={styles.title}>{title}</div>
						{message.text ? <div className={styles.subtitle}>{message.text}</div> : null}
					</div>
				</div>
			</div>
		</div>
	);
}

export default React.memo(Item);
