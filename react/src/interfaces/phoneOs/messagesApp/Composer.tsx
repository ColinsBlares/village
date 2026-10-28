import React, { memo, useState } from 'react';
import type { MessageKind } from './data';
import { IconMic, IconPlus, IconSend } from './icons';
import styles from './index.module.css';

interface ComposerProps {
	value: string;
	onChange: (value: string) => void;
	onSend: (kind: MessageKind, text: string) => void;
}

function Composer({ value, onChange, onSend }: ComposerProps) {
	const [menu, setMenu] = useState(false);
	const ready = value.trim().length > 0;

	function sendText() {
		const text = value.trim();
		if (!text) {
			return;
		}
		onSend('text', text);
		setMenu(false);
	}

	return (
		<div className={styles.composer}>
			{menu ? (
				<div className={styles.menu}>
					<button
						type="button"
						onClick={function () {
							onSend('photo', 'Фото');
							setMenu(false);
						}}
					>
						Фото
					</button>
					<button
						type="button"
						onClick={function () {
							onSend('place', 'Вайнвуд, Лос-Сантос');
							setMenu(false);
						}}
					>
						Геопозиция
					</button>
				</div>
			) : null}
			<button
				type="button"
				className={styles.plus}
				aria-label="Вложения"
				onClick={function () {
					setMenu(!menu);
				}}
			>
				<IconPlus />
			</button>
			<input
				className={styles.field}
				value={value}
				placeholder="iMessage"
				onChange={function (event) {
					onChange(event.target.value);
				}}
				onKeyDown={function (event) {
					if (event.key === 'Enter') {
						event.preventDefault();
						sendText();
					}
				}}
			/>
			{ready ? (
				<button type="button" className={styles.send} aria-label="Отправить" onClick={sendText}>
					<IconSend />
				</button>
			) : (
				<button type="button" className={styles.mic} aria-label="Аудио">
					<IconMic />
				</button>
			)}
		</div>
	);
}

export default memo(Composer);
