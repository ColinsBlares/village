import React, { memo, useState } from 'react';
import { usePhoneAppStore } from '../phoneApp/store';
import Avatar from './Avatar';
import Composer from './Composer';
import styles from './index.module.css';
import { closeCompose, pickContact, sendMessage, setComposeQuery, setDraft, useMessagesStore } from './store';

function Compose() {
	const query = useMessagesStore(state => state.composeQuery);
	const draft = useMessagesStore(state => state.draft);
	const threadId = useMessagesStore(state => state.threadId);
	const contacts = usePhoneAppStore(state => state.contacts);
	const [book, setBook] = useState(false);
	const needle = query.trim().toLowerCase();
	const matches = contacts.filter(function (contact) {
		if (!needle && !book) {
			return false;
		}
		if (!needle) {
			return true;
		}
		return contact.name.toLowerCase().indexOf(needle) >= 0 || contact.phone.indexOf(query.trim()) >= 0;
	});

	return (
		<div className={styles.screen}>
			<div className={styles.composeNav}>
				<button type="button" className={styles.link} onClick={closeCompose}>
					Отмена
				</button>
				<h1>Новое сообщение</h1>
			</div>
			<div className={styles.toRow}>
				<span>Кому:</span>
				<input
					value={query}
					placeholder=""
					onChange={function (event) {
						setComposeQuery(event.target.value);
						setBook(false);
					}}
				/>
				<button
					type="button"
					className={styles.iconBtn}
					aria-label="Контакты"
					onClick={function () {
						setBook(!book);
					}}
				>
					+
				</button>
			</div>
			<div className={styles.scroll}>
				{matches.map(function (contact) {
					return (
						<button
							key={contact.id}
							type="button"
							className={styles.person}
							onClick={function () {
								pickContact(contact.id, contact.name);
							}}
						>
							<Avatar name={contact.name} size={36} />
							<span>
								<strong>{contact.name}</strong>
								<em>{contact.phone}</em>
							</span>
						</button>
					);
				})}
			</div>
			<Composer
				value={draft}
				onChange={setDraft}
				onSend={function (kind, text) {
					if (!threadId) {
						return;
					}
					sendMessage(threadId, text, kind);
				}}
			/>
		</div>
	);
}

export default memo(Compose);
