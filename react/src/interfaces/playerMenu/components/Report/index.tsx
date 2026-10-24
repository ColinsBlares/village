import React, { memo, useState } from 'react';
import styles from './index.module.css';
import { setInputFocus, usePlayerMenuStore } from '../../store';

const MAX_LENGTH = 120;
const WAIT_TIME = 60 * 1000;
let reportLastSentTime = 0;

function Report() {
	const [message, setMessage] = useState('');
	const [showHint, setShowHint] = useState(false);
	const chars = MAX_LENGTH - message.length;

	function send() {
		if (!message.length) return;
		const media = usePlayerMenuStore.getState().media;
		if (!media) {
			const diff = Date.now() - reportLastSentTime;
			if (diff < WAIT_TIME) {
				const notifications = (window as any).notifications;
				if (notifications) {
					notifications.push('error', 'Ожидайте ' + parseInt(String((WAIT_TIME - diff) / 1000), 10) + ' сек.');
				}
				return;
			}
		}
		mp.trigger('callRemote', 'admin.report', message);
		reportLastSentTime = Date.now();
		setMessage('');
		setShowHint(true);
		window.setTimeout(function () {
			setShowHint(false);
		}, 5000);
	}

	return (
		<div className={styles.report}>
			<div className={styles.head}>Задайте вопрос или оставьте жалобу, указав ID игрока и причину. Пока репорт открыт, новые сообщения продолжат тот же чат, а ответ администрации придёт сюда.</div>
			<input
				placeholder="Введите вопрос или жалобу..."
				value={message}
				maxLength={MAX_LENGTH}
				onChange={function (event) { setMessage(event.target.value); }}
				onKeyPress={function (event) {
					if (event.key === 'Enter') send();
				}}
				onFocus={function () { setInputFocus(true); }}
				onBlur={function () { setInputFocus(false); }}
			/>
			<div>Осталось символов: {chars}</div>
			<div className={styles.send} onClick={send}>Отправить</div>
			{showHint ? (
				<div className={styles.hint}>
					Ваше сообщение было отправлено администрации сервера!
					<br />
					Приятной игры!
				</div>
			) : null}
		</div>
	);
}

export default memo(Report);
