import React, { memo, useRef, useState } from 'react';
import Avatar from './Avatar';
import { previewOf, type Thread } from './data';
import { IconCompose, IconPin, IconSearch } from './icons';
import styles from './index.module.css';
import {
	deleteThread,
	openCompose,
	openThread,
	setQuery,
	toggleEditing,
	useMessagesStore,
} from './store';

function ThreadRow({ thread, editing }: { thread: Thread; editing: boolean }) {
	const last = thread.messages[thread.messages.length - 1];
	const startX = useRef(0);
	const pointer = useRef(-1);
	const shiftRef = useRef(0);
	const [shift, setShift] = useState(0);
	const [open, setOpen] = useState(false);

	function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (editing) {
			return;
		}
		pointer.current = event.pointerId;
		startX.current = event.clientX;
		shiftRef.current = open ? -78 : 0;
	}

	function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerId !== pointer.current || editing) {
			return;
		}
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = rect.width / event.currentTarget.offsetWidth || 1;
		const dx = (event.clientX - startX.current) / scale;
		const next = Math.max(-78, Math.min(0, (open ? -78 : 0) + dx));
		shiftRef.current = next;
		setShift(next);
	}

	function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerId !== pointer.current) {
			return;
		}
		pointer.current = -1;
		if (shiftRef.current < -40) {
			setShift(-78);
			setOpen(true);
			return;
		}
		const moved = Math.abs(shiftRef.current) > 8;
		setShift(0);
		setOpen(false);
		shiftRef.current = 0;
		if (!moved) {
			openThread(thread.id);
		}
	}

	return (
		<div className={styles.rowWrap}>
			<button
				type='button'
				className={styles.trash}
				onClick={function () {
					deleteThread(thread.id);
				}}
			>
				Удалить
			</button>
			<div
				className={styles.row}
				style={{
					transform: 'translate3d(' + (editing ? 0 : shift) + 'px,0,0)',
				}}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				{editing ? (
					<span
						className={styles.minus}
						onClick={function (event) {
							event.stopPropagation();
							deleteThread(thread.id);
						}}
					/>
				) : null}
				{thread.unread && !editing ? <i className={styles.dot} /> : null}
				<Avatar name={thread.name} size={46} />
				<span className={styles.main}>
					<span className={styles.top}>
						<strong className={thread.unread ? styles.unread : ''}>
							{thread.name}
							{thread.pinned ? <IconPin /> : null}
						</strong>
						<time className={thread.unread ? styles.fresh : ''}>
							{last ? last.time : ''}
						</time>
					</span>
					<em>{previewOf(last)}</em>
				</span>
			</div>
		</div>
	);
}

const MemoRow = memo(ThreadRow);

function Inbox() {
	const threads = useMessagesStore(state => state.threads);
	const query = useMessagesStore(state => state.query);
	const editing = useMessagesStore(state => state.editing);
	const needle = query.trim().toLowerCase();
	const list = threads
		.filter(function (thread) {
			if (!needle) {
				return true;
			}
			if (thread.name.toLowerCase().indexOf(needle) >= 0) {
				return true;
			}
			return thread.messages.some(function (message) {
				return message.text.toLowerCase().indexOf(needle) >= 0;
			});
		})
		.slice()
		.sort(function (a, b) {
			if (a.pinned === b.pinned) {
				return 0;
			}
			return a.pinned ? -1 : 1;
		});

	return (
		<div className={styles.screen}>
			<div className={styles.nav}>
				<button type='button' className={styles.link} onClick={toggleEditing}>
					{editing ? 'Готово' : 'Править'}
				</button>
				<button
					type='button'
					className={styles.iconBtn}
					aria-label='Новое сообщение'
					onClick={openCompose}
				>
					<IconCompose />
				</button>
			</div>
			<div className={styles.scroll}>
				<h1 className={styles.title}>Сообщения</h1>
				<label className={styles.search}>
					<IconSearch />
					<input
						value={query}
						placeholder='Поиск'
						onChange={function (event) {
							setQuery(event.target.value);
						}}
					/>
				</label>
				{list.length === 0 ? (
					<p className={styles.empty}>Нет результатов</p>
				) : null}
				{list.map(function (thread) {
					return <MemoRow key={thread.id} thread={thread} editing={editing} />;
				})}
			</div>
		</div>
	);
}

export default memo(Inbox);
