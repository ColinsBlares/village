import React, { memo } from 'react';
import { IconChevron, IconHandset, IconMail, IconMessage } from './icons';
import styles from './index.module.css';
import { backToMain, callContact, deleteContact, usePhoneAppStore } from './store';

function initials(name: string) {
	const parts = name.split(' ').filter(Boolean);
	return ((parts[0] && parts[0][0]) || '') + ((parts[1] && parts[1][0]) || '');
}

function ContactCard() {
	const contactId = usePhoneAppStore(state => state.contactId);
	const contacts = usePhoneAppStore(state => state.contacts);
	const contact = contacts.find(item => item.id === contactId);

	if (!contact) {
		return null;
	}

	return (
		<div className={styles.screen}>
			<div className={styles.bar}>
				<button type="button" className={styles.link} onClick={backToMain}>
					<IconChevron />
					Контакты
				</button>
			</div>
			<div className={styles.scroll}>
				<div className={styles.avatar}>{initials(contact.name)}</div>
				<h1 className={styles.name}>{contact.name}</h1>
				<div className={styles.actions}>
					<button type="button" className={styles.pill}>
						<IconMessage />
						сообщение
					</button>
					<button
						type="button"
						className={styles.pill}
						onClick={function () {
							callContact(contact.id);
						}}
					>
						<IconHandset />
						вызов
					</button>
					<button type="button" className={styles.pill}>
						<IconMail />
						почта
					</button>
				</div>
				<div className={styles.card}>
					<button
						type="button"
						onClick={function () {
							callContact(contact.id);
						}}
					>
						<span>мобильный</span>
						<strong>{contact.phone}</strong>
					</button>
				</div>
				<button
					type="button"
					className={styles.danger}
					onClick={function () {
						deleteContact(contact.id);
					}}
				>
					Удалить контакт
				</button>
			</div>
		</div>
	);
}

export default memo(ContactCard);
