import React, { memo, useEffect, useRef } from 'react';
import Avatar from './Avatar';
import Composer from './Composer';
import { IconChevron, IconVideo } from './icons';
import styles from './index.module.css';
import { closeThread, sendMessage, setDraft, useMessagesStore } from './store';

function ThreadView() {
	const threadId = useMessagesStore(state => state.threadId);
	const thread = useMessagesStore(state => state.threads.find(function (item) { return item.id === threadId; }) || null);
	const draft = useMessagesStore(state => state.draft);
	const scroller = useRef<HTMLDivElement>(null);
	const count = thread ? thread.messages.length : 0;

	useEffect(function () {
		const node = scroller.current;
		if (node) {
			node.scrollTop = node.scrollHeight;
		}
	}, [count, threadId]);

	if (!thread) {
		return null;
	}

	const last = thread.messages[thread.messages.length - 1];

	return (
		<div className={styles.screen}>
			<div className={styles.threadNav}>
				<button type="button" className={styles.iconBtn} aria-label="Назад" onClick={closeThread}>
					<IconChevron />
				</button>
				<button type="button" className={styles.who} onClick={closeThread}>
					<Avatar name={thread.name} size={34} />
					<span>{thread.name}</span>
				</button>
				<button type="button" className={styles.iconBtn} aria-label="Видео">
					<IconVideo />
				</button>
			</div>
			<div className={styles.thread} ref={scroller}>
				{thread.messages[0] ? <div className={styles.stamp}>Сегодня {thread.messages[0].time}</div> : null}
				{thread.messages.map(function (message, index) {
					const next = thread.messages[index + 1];
					const tail = !next || next.fromMe !== message.fromMe;
					const side = message.fromMe ? styles.out : styles.in;
					if (message.kind === 'photo') {
						return <div key={message.id} className={styles.photo + ' ' + side + (tail ? ' ' + styles.tail : '')} />;
					}
					return (
						<div key={message.id} className={styles.bubble + ' ' + side + (tail ? ' ' + styles.tail : '')}>
							{message.kind === 'place' ? <i className={styles.pin} /> : null}
							{message.text}
						</div>
					);
				})}
				{last && last.fromMe ? <div className={styles.delivered}>Доставлено</div> : null}
			</div>
			<Composer
				value={draft}
				onChange={setDraft}
				onSend={function (kind, text) {
					sendMessage(thread.id, text, kind);
				}}
			/>
		</div>
	);
}

export default memo(ThreadView);
